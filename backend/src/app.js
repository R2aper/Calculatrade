const crypto = require('node:crypto');
const argon2 = require('argon2');
const Fastify = require('fastify');
const cookie = require('@fastify/cookie');
const cors = require('@fastify/cors');
const { pool, query, transaction } = require('./db');
const config = require('./config')();
const { id, validate } = require('./validation');
const COOKIE = 'calculatrade_session';
const defaults = ['damage * probability * priority', 4, 4, 4, 12, 50000];
const safeUser = r => ({ id: String(r.id), login: r.login, createdAt: r.created_at });
const apiError = (reply, status, code, message) => reply.code(status).send({ error: { code, message } });
function publicRow(row) { const out = {}; for (const [k, v] of Object.entries(row)) out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = (typeof v === 'bigint' ? String(v) : v); return out; }
function sessionHash(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
async function build() {
  const app = Fastify({ logger: { redact: ['req.headers.cookie', 'password', 'passwordHash'] } });
  await app.register(cookie);
  if (config.corsOrigin) await app.register(cors, { origin: config.corsOrigin, credentials: true });
  app.decorateRequest('user', null);
  app.addHook('preHandler', async req => {
    const token = req.cookies[COOKIE]; if (!token) return;
    const result = await query('SELECT u.id,u.login,u.created_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=$1 AND s.expires_at>now()', [sessionHash(token)]);
    if (result.rowCount) { req.user = safeUser(result.rows[0]); await query('UPDATE sessions SET last_seen_at=now() WHERE id=$1', [sessionHash(token)]); }
  });
  const auth = req => req.user || null;
  const requireAuth = (req, reply) => { if (!auth(req)) { apiError(reply, 401, 'UNAUTHORIZED', 'Требуется авторизация'); return false; } return true; };
  async function establish(reply, userId) { const token = crypto.randomBytes(32).toString('hex'); await query('INSERT INTO sessions(id,user_id,expires_at) VALUES($1,$2,now()+interval \'30 days\')', [sessionHash(token), userId]); reply.setCookie(COOKIE, token, { httpOnly: true, secure: config.nodeEnv === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 }); }
  app.get('/health', async (_, reply) => { try { await query('SELECT 1'); return { status: 'ok', database: 'ok' }; } catch { return reply.code(503).send({ status: 'error', database: 'unavailable' }); } });
  app.post('/api/auth/register', async (req, reply) => {
    const { login, password } = req.body || {};
    if (!/^[^\s@]{3,100}$/.test(login || '') || typeof password !== 'string' || password.length < 8 || password.length > 200) return apiError(reply, 400, 'VALIDATION_ERROR', 'Некорректный логин или пароль');
    try { const user = await transaction(async c => { const r = await c.query('INSERT INTO users(login,password_hash) VALUES(lower($1),$2) RETURNING id,login,created_at', [login.trim(), await argon2.hash(password, { type: argon2.argon2id })]); await c.query('INSERT INTO criteria(user_id,formula,damage_max,prob_max,priority_max,risk_appetite,cost_per_point) VALUES($1,$2,$3,$4,$5,$6,$7)', [r.rows[0].id, ...defaults]); return r.rows[0]; }); await establish(reply, user.id); return { user: safeUser(user) }; } catch (e) { if (e.code === '23505') return apiError(reply, 409, 'CONFLICT', 'Пользователь уже существует'); throw e; }
  });
  app.post('/api/auth/login', async (req, reply) => { const { login, password } = req.body || {}; const r = await query('SELECT id,login,password_hash,created_at FROM users WHERE login=lower($1)', [String(login || '').trim()]); if (!r.rowCount || typeof password !== 'string' || !(await argon2.verify(r.rows[0].password_hash, password))) return apiError(reply, 401, 'INVALID_CREDENTIALS', 'Неверный логин или пароль'); await establish(reply, r.rows[0].id); return { user: safeUser(r.rows[0]) }; });
  app.get('/api/auth/me', async (req, reply) => req.user ? { user: req.user } : apiError(reply, 401, 'UNAUTHORIZED', 'Требуется авторизация'));
  app.post('/api/auth/logout', async (req, reply) => { const token = req.cookies[COOKIE]; if (token) await query('DELETE FROM sessions WHERE id=$1', [sessionHash(token)]); reply.clearCookie(COOKIE, { path: '/' }); return { ok: true }; });
  app.get('/api/criteria', async (req, reply) => { if (!requireAuth(req, reply)) return; const r = await query('SELECT formula,damage_max,prob_max,priority_max,risk_appetite,cost_per_point FROM criteria WHERE user_id=$1', [req.user.id]); return publicRow(r.rows[0]); });
  app.put('/api/criteria', async (req, reply) => { if (!requireAuth(req, reply)) return; const errors = validate('criteria', req.body || {}); if (errors.length) return apiError(reply, 400, 'VALIDATION_ERROR', `Некорректные поля: ${errors.join(', ')}`); const b=req.body; const r=await query('UPDATE criteria SET formula=$1,damage_max=$2,prob_max=$3,priority_max=$4,risk_appetite=$5,cost_per_point=$6,updated_at=now() WHERE user_id=$7 RETURNING formula,damage_max,prob_max,priority_max,risk_appetite,cost_per_point',[b.formula,b.damageMax,b.probMax,b.priorityMax,b.riskAppetite,b.costPerPoint,req.user.id]); return publicRow(r.rows[0]); });
  const configs = {
    assets: { table:'assets', type:'asset', fields:['name','value','priority'], defaults:['priority',3] },
    measures: { table:'measures', type:'measure', fields:['name','cost','reduceDamage','reduceProb','linkedRiskId'], defaults:['reduceDamage',40,'reduceProb',80,'linkedRiskId',null] },
    risks: { table:'risks', type:'risk', fields:['assetId','threat','vulnerability','damage','probability','priority','score','residualScore','measureId','reduceDamage','reduceProb'], defaults:['damage',2,'probability',2,'priority',3,'score',0,'residualScore',null,'measureId',null,'reduceDamage',0,'reduceProb',0] }
  };
  for (const [resource, c] of Object.entries(configs)) {
    const table = c.table;
    app.get(`/api/${resource}`, async (req, reply) => { if (!requireAuth(req, reply)) return; const r=await query(`SELECT * FROM ${table} WHERE user_id=$1 ORDER BY id`,[req.user.id]); return r.rows.map(publicRow); });
    app.post(`/api/${resource}`, async (req, reply) => { if (!requireAuth(req, reply)) return; const b={...(req.body||{})}; for(let i=0;i<c.defaults.length;i+=2) if(b[c.defaults[i]]===undefined)b[c.defaults[i]]=c.defaults[i+1]; const errors=validate(c.type,b); if(errors.length)return apiError(reply,400,'VALIDATION_ERROR',`Некорректные поля: ${errors.join(', ')}`); if(resource==='risks' && !(await query('SELECT 1 FROM assets WHERE id=$1 AND user_id=$2',[b.assetId,req.user.id])).rowCount)return apiError(reply,400,'VALIDATION_ERROR','Актив не найден'); if(resource==='risks' && b.measureId !== null && !(await query('SELECT 1 FROM measures WHERE id=$1 AND user_id=$2',[b.measureId,req.user.id])).rowCount)return apiError(reply,400,'VALIDATION_ERROR','Мера не найдена'); if(resource==='measures' && b.linkedRiskId !== null && !(await query('SELECT 1 FROM risks WHERE id=$1 AND user_id=$2',[b.linkedRiskId,req.user.id])).rowCount)return apiError(reply,400,'VALIDATION_ERROR','Риск не найден'); const cols=c.fields.map(x=>x.replace(/[A-Z]/g,m=>`_${m.toLowerCase()}`)); const vals=c.fields.map(x=>b[x]); const r=await query(`INSERT INTO ${table}(user_id,${cols.join(',')}) VALUES($1,${cols.map((_,i)=>`$${i+2}`).join(',')}) RETURNING *`,[req.user.id,...vals]); return reply.code(201).send(publicRow(r.rows[0])); });
    app.patch(`/api/${resource}/:id`, async (req, reply) => { if (!requireAuth(req, reply)) return; if (!id(req.params.id)) return apiError(reply,400,'VALIDATION_ERROR','Некорректный id'); const b=req.body||{}; const keys=Object.keys(b); if(!keys.length||keys.some(k=>!c.fields.includes(k)))return apiError(reply,400,'VALIDATION_ERROR','Неизвестное поле'); const errors=validate(c.type,b,true); if(errors.length)return apiError(reply,400,'VALIDATION_ERROR',`Некорректные поля: ${errors.join(', ')}`); if(resource==='risks' && b.assetId !== undefined && !(await query('SELECT 1 FROM assets WHERE id=$1 AND user_id=$2',[b.assetId,req.user.id])).rowCount)return apiError(reply,400,'VALIDATION_ERROR','Актив не найден'); if(resource==='risks' && b.measureId !== undefined && b.measureId !== null && !(await query('SELECT 1 FROM measures WHERE id=$1 AND user_id=$2',[b.measureId,req.user.id])).rowCount)return apiError(reply,400,'VALIDATION_ERROR','Мера не найдена'); if(resource==='measures' && b.linkedRiskId !== undefined && b.linkedRiskId !== null && !(await query('SELECT 1 FROM risks WHERE id=$1 AND user_id=$2',[b.linkedRiskId,req.user.id])).rowCount)return apiError(reply,400,'VALIDATION_ERROR','Риск не найден'); const sets=keys.map((k,i)=>`${k.replace(/[A-Z]/g,m=>`_${m.toLowerCase()}`)}=$${i+1}`); const r=await query(`UPDATE ${table} SET ${sets.join(',')},updated_at=now() WHERE id=$${keys.length+1} AND user_id=$${keys.length+2} RETURNING *`,[...keys.map(k=>b[k]),req.params.id,req.user.id]); if(!r.rowCount)return apiError(reply,404,'NOT_FOUND','Запись не найдена'); return publicRow(r.rows[0]); });
    app.delete(`/api/${resource}/:id`, async (req, reply) => { if (!requireAuth(req, reply)) return; if (!id(req.params.id)) return apiError(reply,400,'VALIDATION_ERROR','Некорректный id'); await transaction(async c => { if(resource==='assets') await c.query('DELETE FROM risks WHERE asset_id=$1 AND user_id=$2',[req.params.id,req.user.id]); if(resource==='measures') await c.query('UPDATE risks SET measure_id=NULL,reduce_damage=0,reduce_prob=0,residual_score=NULL WHERE measure_id=$1 AND user_id=$2',[req.params.id,req.user.id]); await c.query(`DELETE FROM ${table} WHERE id=$1 AND user_id=$2`,[req.params.id,req.user.id]); }); return { ok:true }; });
  }
  app.post('/api/me/reset', async (req, reply) => { if (!requireAuth(req, reply)) return; await transaction(async c=>{ for(const t of ['risks','measures','assets'])await c.query(`DELETE FROM ${t} WHERE user_id=$1`,[req.user.id]); await c.query('UPDATE criteria SET formula=$1,damage_max=4,prob_max=4,priority_max=4,risk_appetite=12,cost_per_point=50000,updated_at=now() WHERE user_id=$2', [defaults[0],req.user.id]); }); return {ok:true}; });
  app.delete('/api/me', async (req, reply) => { if (!requireAuth(req, reply)) return; if(typeof req.body?.password!=='string')return apiError(reply,400,'VALIDATION_ERROR','Требуется пароль'); const r=await query('SELECT password_hash FROM users WHERE id=$1',[req.user.id]); if(!(await argon2.verify(r.rows[0].password_hash,req.body.password)))return apiError(reply,401,'INVALID_CREDENTIALS','Неверный пароль'); await query('DELETE FROM users WHERE id=$1',[req.user.id]); reply.clearCookie(COOKIE,{path:'/'}); return {ok:true}; });
  app.setErrorHandler((err, req, reply) => { req.log.error({ err: err.message }, 'request failed'); return apiError(reply, err.statusCode || 500, err.statusCode ? 'REQUEST_ERROR' : 'INTERNAL_ERROR', err.statusCode ? err.message : 'Внутренняя ошибка'); });
  return app;
}
module.exports = { build };
