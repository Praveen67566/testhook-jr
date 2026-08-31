import { pool } from '../configs/db.js';

export async function insertWhatsappEvent(
  payload,
  requestMetadata
) {
  /*
   * Combine metadata coming from frontend
   * with metadata collected by the backend.
   */
  const metadata = {
    ...(payload.metadata ?? {}),

    request: requestMetadata,
  };

  const query = `
    INSERT INTO events (
      event_info,
      page_name,
      text,
      metadata
    )
    VALUES (
      $1,
      $2,
      $3,
      $4::jsonb
    )
    RETURNING
      id::text AS id
  `;

  const values = [
    payload.event_info,
    payload.page_name,
    payload.text,
    JSON.stringify(metadata),
  ];

  const result = await pool.query(
    query,
    values
  );

  return result.rows[0];
}

export async function findWhatsappEvents({
  page,
  limit,
}) {
  const offset = (page - 1) * limit;

  const query = `
    SELECT
      id::text AS id,
      event_info,
      page_name,
      text,
      metadata,
      event_time,
      check_with_nyife
    FROM events
    ORDER BY event_time DESC, id DESC
    LIMIT $1
    OFFSET $2
  `;

  const values = [
    limit,
    offset,
  ];

  const [result, countResult] = await Promise.all([
    pool.query(query, values),
    pool.query(`
      SELECT COUNT(*)::text AS total
      FROM events
    `),
  ]);

  return {
    events: result.rows,
    total: Number.parseInt(
      countResult.rows[0]?.total ?? '0',
      10
    ),
  };
}
