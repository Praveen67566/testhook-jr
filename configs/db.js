import { Pool } from 'pg';
import { env } from './env.js';

export const pool = new Pool({
  host: env.LEADS_DB_HOST,
  port: env.LEADS_DB_PORT,
  database: env.LEADS_DB_NAME,
  user: env.LEADS_DB_USER,
  password: env.LEADS_DB_PASSWORD,

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error.', {
    code: error?.code ?? 'UNKNOWN',
  });
});

export async function checkDatabaseConnection() {
  await pool.query('SELECT 1');
}

export async function closeDatabase() {
  await pool.end();
}