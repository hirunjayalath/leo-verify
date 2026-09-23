-- Least-privilege role for the Next.js app (Prisma).
-- Apply AFTER prisma migrate and supabase/rls-policies.sql.
-- Hosted Supabase postgres is not a superuser — do not set SUPERUSER or BYPASSRLS.
--
-- DIRECT_DATABASE_URL stays the owner (postgres) for migrate.
-- DATABASE_URL should use leoverify_app + the transaction pooler after this script.
--
-- Tenant isolation for Prisma is still enforced in app code (clubId / session).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'leoverify_app') THEN
    CREATE ROLE leoverify_app LOGIN NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE postgres TO leoverify_app;
GRANT USAGE ON SCHEMA public TO leoverify_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO leoverify_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO leoverify_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO leoverify_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO leoverify_app;

-- Permissive for the app role so existing Prisma queries keep working.
-- Club scoping remains in src/lib and admin pages.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'District', 'Club', 'User', 'Event', 'CertificateTemplate',
    'Certificate', 'Recipient', 'AuditLog', 'ImportJob', 'ImportJobRow'
  ]
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS leoverify_app_dml ON %I',
      t
    );
    EXECUTE format(
      'CREATE POLICY leoverify_app_dml ON %I FOR ALL TO leoverify_app USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END
$$;

-- ALTER ROLE leoverify_app PASSWORD 'generate-a-long-random-password';
-- DATABASE_URL=postgresql://leoverify_app:PASSWORD@…pooler…:6543/postgres?pgbouncer=true
