BEGIN;

SET ROLE jr_leads_owner;

CREATE TABLE events (
  id BIGINT
    GENERATED ALWAYS AS IDENTITY
    PRIMARY KEY,

  event_info TEXT NOT NULL,

  page_name VARCHAR(500) NOT NULL,

  text TEXT NOT NULL,

  metadata JSONB
    NOT NULL
    DEFAULT '{}'::jsonb,

  event_time TIMESTAMPTZ
    NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

  check_with_nyife BOOLEAN
    NOT NULL
    DEFAULT FALSE
);

CREATE INDEX events_event_time
ON events (
  event_time DESC
);

CREATE INDEX events_check_with_nyife_event_time
ON events (
  check_with_nyife,
  event_time DESC
);

RESET ROLE;


/*
 * Allow application user
 * to INSERT events.
 */
GRANT INSERT
ON TABLE events
TO jr_leads_writer;


/*
 * Required because:
 *
 * POST /whatsapp
 * uses RETURNING id
 *
 * and
 *
 * GET /whatsapp
 * reads the event rows.
 */
GRANT SELECT
ON TABLE events
TO jr_leads_writer;


/*
 * Required for generated
 * identity ID.
 */
GRANT USAGE
ON SEQUENCE events_id_seq
TO jr_leads_writer;

COMMIT;