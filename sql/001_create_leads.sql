BEGIN;

SET ROLE jr_leads_owner;

CREATE TYPE lead_type AS ENUM (
  'corporate',
  'technical',
  'global'
);

CREATE TABLE leads (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  lead_type lead_type NOT NULL,

  name VARCHAR(200) NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(40) NOT NULL,

  message TEXT NULL,

  page_name VARCHAR(500) NULL,
  form_name VARCHAR(200) NULL,
  source VARCHAR(2048) NULL,

  responsible VARCHAR(200) NULL,
  stage VARCHAR(100) NULL,

  utm_source VARCHAR(500) NULL,
  utm_medium VARCHAR(500) NULL,
  utm_campaign VARCHAR(500) NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX leads_type_created_at
ON leads (lead_type, created_at);

CREATE INDEX leads_created_at
ON leads (created_at);

RESET ROLE;

/*
 * Application permissions
 */

GRANT CONNECT
ON DATABASE jrcompliance_leads
TO jr_leads_writer;

GRANT USAGE
ON SCHEMA public
TO jr_leads_writer;

GRANT INSERT
ON TABLE leads
TO jr_leads_writer;

/*
 * Required for RETURNING id
 */
GRANT SELECT (id)
ON TABLE leads
TO jr_leads_writer;

/*
 * Required for generated identity value.
 */
GRANT USAGE
ON SEQUENCE leads_id_seq
TO jr_leads_writer;

COMMIT;