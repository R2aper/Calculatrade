const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('./db');
async function main() {
  const client = await pool.connect();
  try {
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
    const files = fs.readdirSync(path.join(__dirname, '..', 'migrations')).filter(f => f.endsWith('.sql')).sort();
    const applied = (await client.query('SELECT version FROM schema_migrations')).rows.map(r => r.version);
    if (process.argv[2] === 'rollback') {
      throw new Error(
          'Rollback is not available: add and review a dedicated down migration before reverting schema changes.');
    }
    for (const file of files) if (!applied.includes(file)) { await client.query('BEGIN'); await client.query(fs.readFileSync(path.join(__dirname, '..', 'migrations', file), 'utf8')); await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [file]); await client.query('COMMIT'); console.log(`Applied ${file}`); }
  } finally { client.release(); await pool.end(); }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
