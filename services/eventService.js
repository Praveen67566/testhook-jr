import { pool } from '../configs/db.js';

export async function insertWhatsappEvent(
  payload,
  requestMetadata
) {
  return insertEvent(payload, requestMetadata);
}

export async function insertCallEvent(
  payload,
  requestMetadata
) {
  return insertEvent(payload, requestMetadata);
}

async function insertEvent(payload, requestMetadata) {
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
    WHERE event_info <> 'call_click'
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
      WHERE event_info <> 'call_click'
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

export async function findCallEvents({
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
    WHERE event_info = 'call_click'
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
      WHERE event_info = 'call_click'
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
