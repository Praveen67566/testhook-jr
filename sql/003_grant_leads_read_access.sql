BEGIN;

/*
 * The authenticated GET /leads admin page reads complete lead rows.
 * The original migration only granted SELECT on the id column.
 */
GRANT SELECT
ON TABLE leads
TO jr_leads_writer;

COMMIT;
