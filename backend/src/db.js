const { Pool } = require('pg');
const config = require('./config')();
const pool = new Pool({ connectionString: config.databaseUrl, max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
const query = (text, values) => pool.query(text, values);
async function transaction(fn) { const client = await pool.connect(); try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); } }
module.exports = { pool, query, transaction };
