import { pool } from '../configs/db.js';

export async function getHealth(req, res) {
  try {
    await pool.query('SELECT 1');

    return res.status(200).json({
      success: true,
      service: 'jr-leads-webhook',
      database: 'healthy',
    });
  } catch {
    console.error('Database health check failed.');

    return res.status(503).json({
      success: false,
      service: 'jr-leads-webhook',
      database: 'unavailable',
    });
  }
}