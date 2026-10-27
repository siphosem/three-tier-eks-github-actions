const { Pool } = require('pg');

function poolFromEnv(env = process.env) {
  return new Pool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT) || 5432,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME || 'notes',
    max: 10,
    // RDS enforces TLS; rejectUnauthorized=false skips CA pinning for the lab.
    ssl: env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
  });
}

async function migrate(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      text VARCHAR(500) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

module.exports = { poolFromEnv, migrate };
