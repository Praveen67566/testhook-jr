import { pool } from '../configs/db.js';

export async function insertLead(leadType, payload) {
  const pageParameters = payload.page_parameters ?? {};

  const query = `
    INSERT INTO leads (
      lead_type,
      name,
      email,
      phone,
      message,
      page_name,
      form_name,
      source,
      responsible,
      stage,
      utm_source,
      utm_medium,
      utm_campaign
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11,
      $12,
      $13
    )
    RETURNING id::text AS id
  `;

  const values = [
    leadType,

    payload.name,
    payload.email,
    payload.phone,

    payload.message ?? null,

    payload.page_name ?? null,
    payload.form_name ?? null,
    payload.source ?? null,

    payload.responsible ?? null,
    payload.stage ?? null,

    pageParameters.utm_source ?? null,
    pageParameters.utm_medium ?? null,
    pageParameters.utm_campaign ?? null,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
}

export async function findLeads({
  page,
  limit,
}) {
  const offset = (page - 1) * limit;

  const [result, countResult] = await Promise.all([
    pool.query(
      `
        SELECT
          id::text AS id,
          lead_type,
          name,
          email,
          phone,
          message,
          page_name,
          form_name,
          source,
          responsible,
          stage,
          utm_source,
          utm_medium,
          utm_campaign,
          created_at
        FROM leads
        ORDER BY created_at DESC, id DESC
        LIMIT $1
        OFFSET $2
      `,
      [
        limit,
        offset,
      ]
    ),
    pool.query(`
      SELECT COUNT(*)::text AS total
      FROM leads
    `),
  ]);

  return {
    leads: result.rows,
    total: Number.parseInt(
      countResult.rows[0]?.total ?? '0',
      10
    ),
  };
}
