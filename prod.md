# Production backup and Nyife database migration

This runbook backs up the live PostgreSQL database and applies
`sql/004_add_nyife_leads.sql` for the Nyife lead integration.

The migration is additive. It adds the `nyife` lead type and nullable columns;
it does not delete or rewrite existing JR Compliance leads or events.

## Before starting

- Schedule a deployment window and tell anyone who monitors the service.
- Confirm there is enough free disk space for at least two database dumps.
- Use a PostgreSQL administrator account that can `SET ROLE jr_leads_owner`.
  The application account, `jr_leads_writer`, is not the migration account.
- Do not put a database password in a command, shell history, Git, or this file.
  The commands below use PostgreSQL's interactive password prompt.
- Replace `/var/www/testhook-jr` if the repository is installed elsewhere.

SSH into the production server and set these values for the current shell:

```bash
JR_APP_DIR="/var/www/testhook-jr"
JR_DB_HOST="127.0.0.1"
JR_DB_PORT="5432"
JR_DB_NAME="jrcompliance_leads"
JR_DB_MIGRATION_USER="postgres"
JR_BACKUP_DIR="/var/backups/testhook-jr"

cd "$JR_APP_DIR"
```

If production does not permit TCP password authentication for `postgres`, run
the `pg_dump`, `pg_restore`, and `psql` commands as the local PostgreSQL
administrator instead, for example:

```bash
sudo -u postgres psql --dbname="jrcompliance_leads"
```

## 1. Production preflight

Confirm the host, repository, PostgreSQL tools, and database connection:

```bash
hostname
pwd
git status --short
git rev-parse --short HEAD
node --version
psql --version
pg_dump --version
df -h "$JR_APP_DIR"

psql \
  --host="$JR_DB_HOST" \
  --port="$JR_DB_PORT" \
  --username="$JR_DB_MIGRATION_USER" \
  --dbname="$JR_DB_NAME" \
  --password \
  --set=ON_ERROR_STOP=1 \
  --command="SELECT current_database(), current_user, version();"
```

Stop if `git status --short` displays unexpected production edits, the
database connection fails, or disk space is insufficient.

Record the current row counts before migration:

```bash
psql \
  --host="$JR_DB_HOST" \
  --port="$JR_DB_PORT" \
  --username="$JR_DB_MIGRATION_USER" \
  --dbname="$JR_DB_NAME" \
  --password \
  --set=ON_ERROR_STOP=1 \
  --command="SELECT 'leads' AS table_name, COUNT(*) FROM leads UNION ALL SELECT 'events', COUNT(*) FROM events;"
```

## 2. Create and verify the production backup

Create a restricted backup directory. The second command may be used when the
directory requires root permission:

```bash
mkdir -p "$JR_BACKUP_DIR"
chmod 700 "$JR_BACKUP_DIR"
```

If that returns `Permission denied`:

```bash
sudo install -d -m 0700 -o "$(id -un)" -g "$(id -gn)" "$JR_BACKUP_DIR"
```

Create a timestamped custom-format backup. `pg_dump` takes a consistent
snapshot, so normal application writes do not produce a partially captured
database:

```bash
JR_BACKUP_TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
JR_BACKUP_BASENAME="jrcompliance_leads_before_nyife_${JR_BACKUP_TIMESTAMP}.dump"
JR_BACKUP_FILE="$JR_BACKUP_DIR/$JR_BACKUP_BASENAME"

pg_dump \
  --host="$JR_DB_HOST" \
  --port="$JR_DB_PORT" \
  --username="$JR_DB_MIGRATION_USER" \
  --dbname="$JR_DB_NAME" \
  --password \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="$JR_BACKUP_FILE"
```

Verify that the file exists, is non-empty, and has a readable archive catalog:

```bash
test -s "$JR_BACKUP_FILE"
pg_restore --list "$JR_BACKUP_FILE" > /dev/null
ls -lh "$JR_BACKUP_FILE"

cd "$JR_BACKUP_DIR"
sha256sum "$JR_BACKUP_BASENAME" > "$JR_BACKUP_BASENAME.sha256"
sha256sum --check "$JR_BACKUP_BASENAME.sha256"
chmod 600 "$JR_BACKUP_BASENAME" "$JR_BACKUP_BASENAME.sha256"
cd "$JR_APP_DIR"
```

Do not continue unless `sha256sum` reports `OK`.

### Optional role backup

A database dump contains the application data and schema, but PostgreSQL roles
are cluster-wide objects. A database administrator can capture them separately:

```bash
JR_GLOBALS_FILE="$JR_BACKUP_DIR/postgres_globals_${JR_BACKUP_TIMESTAMP}.sql"

pg_dumpall \
  --host="$JR_DB_HOST" \
  --port="$JR_DB_PORT" \
  --username="$JR_DB_MIGRATION_USER" \
  --password \
  --globals-only \
  --file="$JR_GLOBALS_FILE"

chmod 600 "$JR_GLOBALS_FILE"
```

The globals file can contain password hashes and must be handled like a secret.

### Copy the backup off the production server

From a secure administrator workstation, copy the dump and checksum. Replace
the SSH user and host:

```bash
scp deploy@example-production-server:/var/backups/testhook-jr/jrcompliance_leads_before_nyife_YYYYMMDDTHHMMSSZ.dump .
scp deploy@example-production-server:/var/backups/testhook-jr/jrcompliance_leads_before_nyife_YYYYMMDDTHHMMSSZ.dump.sha256 .
sha256sum --check jrcompliance_leads_before_nyife_YYYYMMDDTHHMMSSZ.dump.sha256
```

Keep at least one verified copy outside the production server.

## 3. Deploy and inspect the migration

Return to the production server, update the checked-out code, and verify the
migration file before running it:

```bash
cd "$JR_APP_DIR"
git fetch origin
git pull --ff-only origin main
git rev-parse --short HEAD
git status --short

test -f sql/004_add_nyife_leads.sql
sed -n '1,200p' sql/004_add_nyife_leads.sql
```

The expected migration only:

- adds `nyife` to the `lead_type` enum;
- adds `company`, `plan`, `demo_date`, and `demo_time`;
- adds `utm_term`, `utm_content`, `fbclid`, and `gclid`.

Stop if the file contains destructive statements such as `DROP`, `TRUNCATE`,
or an unexpected data update.

## 4. Apply the migration

Run the migration with `ON_ERROR_STOP`, which makes `psql` return a failure as
soon as any statement fails. The SQL file also uses a transaction.

```bash
cd "$JR_APP_DIR"

psql \
  --no-psqlrc \
  --host="$JR_DB_HOST" \
  --port="$JR_DB_PORT" \
  --username="$JR_DB_MIGRATION_USER" \
  --dbname="$JR_DB_NAME" \
  --password \
  --set=ON_ERROR_STOP=1 \
  --file=sql/004_add_nyife_leads.sql
```

Expected final output includes `ALTER TYPE`, `ALTER TABLE`, and `COMMIT`.

The migration uses `IF NOT EXISTS`, so rerunning this exact file is safe if it
completed previously.

## 5. Verify the database schema

Confirm the new enum value:

```bash
psql \
  --host="$JR_DB_HOST" \
  --port="$JR_DB_PORT" \
  --username="$JR_DB_MIGRATION_USER" \
  --dbname="$JR_DB_NAME" \
  --password \
  --set=ON_ERROR_STOP=1 \
  --command="SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_type.oid = pg_enum.enumtypid WHERE pg_type.typname = 'lead_type' ORDER BY enumsortorder;"
```

The result must include `corporate`, `technical`, `global`, and `nyife`.

Confirm all eight columns:

```bash
psql \
  --host="$JR_DB_HOST" \
  --port="$JR_DB_PORT" \
  --username="$JR_DB_MIGRATION_USER" \
  --dbname="$JR_DB_NAME" \
  --password \
  --set=ON_ERROR_STOP=1 \
  --command="SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name IN ('company', 'plan', 'demo_date', 'demo_time', 'utm_term', 'utm_content', 'fbclid', 'gclid') ORDER BY column_name;"
```

The query must return exactly eight rows.

Confirm the original data counts have not decreased:

```bash
psql \
  --host="$JR_DB_HOST" \
  --port="$JR_DB_PORT" \
  --username="$JR_DB_MIGRATION_USER" \
  --dbname="$JR_DB_NAME" \
  --password \
  --set=ON_ERROR_STOP=1 \
  --command="SELECT 'leads' AS table_name, COUNT(*) FROM leads UNION ALL SELECT 'events', COUNT(*) FROM events;"
```

## 6. Restart and verify the application

Use the command that matches the production process manager. Do not run both.
Replace `testhook-jr` if the actual service/process name differs.

For systemd:

```bash
sudo systemctl restart testhook-jr
sudo systemctl status testhook-jr --no-pager
sudo journalctl -u testhook-jr -n 100 --no-pager
```

For PM2:

```bash
pm2 restart testhook-jr --update-env
pm2 status testhook-jr
pm2 logs testhook-jr --lines 100 --nostream
```

Verify health through the public HTTPS endpoint:

```bash
curl --fail --show-error --silent \
  https://testhook.jrcompliance.com/health
```

Expected response:

```json
{"success":true,"service":"jr-leads-webhook","database":"healthy"}
```

Verify the protected Nyife JSON page. Curl will prompt for the admin password:

```bash
JR_ADMIN_USERNAME="your-admin-username"

curl --fail --show-error --silent \
  --user "$JR_ADMIN_USERNAME" \
  --header "Accept: application/json" \
  "https://testhook.jrcompliance.com/nyife/leads?format=json"
```

Also open these pages in a browser and confirm the navigation groups and data:

- `https://testhook.jrcompliance.com/leads`
- `https://testhook.jrcompliance.com/whatsapp`
- `https://testhook.jrcompliance.com/call`
- `https://testhook.jrcompliance.com/nyife/leads`

Before enabling the Nyife frontend, ensure its exact origin is present in
`LEADS_ALLOWED_ORIGINS` in the production `.env`. An origin contains only the
scheme and host, for example `https://example.com`, and does not include a path.
Restart the application after changing `.env`.

## 7. Rollback strategy

This migration only adds nullable schema elements. If the new application code
has a problem, the safest rollback is:

1. deploy the previous application commit;
2. restart the application;
3. leave the new enum value and nullable columns in place.

The old application ignores the additional schema, so a destructive database
rollback should not normally be necessary.

Do not attempt to remove the `nyife` enum value directly. PostgreSQL does not
support a simple safe `DROP VALUE`, and rebuilding an enum can damage dependent
data if handled incorrectly.

## 8. Validate a restore without touching production

Periodically prove that the backup can be restored. Restore it into a new,
temporary database rather than overwriting production:

```bash
JR_RESTORE_DB="jrcompliance_leads_restore_check_${JR_BACKUP_TIMESTAMP}"

createdb \
  --host="$JR_DB_HOST" \
  --port="$JR_DB_PORT" \
  --username="$JR_DB_MIGRATION_USER" \
  --password \
  --owner="jr_leads_owner" \
  "$JR_RESTORE_DB"

pg_restore \
  --host="$JR_DB_HOST" \
  --port="$JR_DB_PORT" \
  --username="$JR_DB_MIGRATION_USER" \
  --dbname="$JR_RESTORE_DB" \
  --password \
  --exit-on-error \
  --verbose \
  "$JR_BACKUP_FILE"

psql \
  --host="$JR_DB_HOST" \
  --port="$JR_DB_PORT" \
  --username="$JR_DB_MIGRATION_USER" \
  --dbname="$JR_RESTORE_DB" \
  --password \
  --set=ON_ERROR_STOP=1 \
  --command="SELECT 'leads' AS table_name, COUNT(*) FROM leads UNION ALL SELECT 'events', COUNT(*) FROM events;"
```

Only after confirming the database name is the temporary restore database, it
can be removed:

```bash
printf '%s\n' "$JR_RESTORE_DB"

dropdb \
  --host="$JR_DB_HOST" \
  --port="$JR_DB_PORT" \
  --username="$JR_DB_MIGRATION_USER" \
  --password \
  "$JR_RESTORE_DB"
```

Restoring over the live database is a destructive, downtime operation. Use the
verified dump, stop application writes, and involve the database administrator
before any production replacement.

## Completion checklist

- [ ] Pre-migration lead and event counts recorded
- [ ] Custom-format database dump created
- [ ] `pg_restore --list` succeeded
- [ ] SHA-256 verification succeeded
- [ ] Backup copied off-server
- [ ] Migration applied with `ON_ERROR_STOP`
- [ ] `nyife` enum value verified
- [ ] Eight new columns verified
- [ ] Original row counts unchanged
- [ ] Application restarted and healthy
- [ ] JR Compliance admin pages still work
- [ ] Nyife leads page works
- [ ] Nyife frontend origin is allowed by CORS
