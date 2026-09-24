-- Least-privilege roles for the Next.js app.
-- Applied by Prisma migration after tables exist (also kept here as the readable copy).
--
-- DATABASE_URL          → leoverify_app     (RLS enforced, withRlsContext)
-- SERVICE_DATABASE_URL  → leoverify_service (public verify, portals, signup bootstrap)
-- DIRECT_DATABASE_URL   → owner (postgres) for migrate / seed (BYPASSRLS)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'leoverify_app') THEN
    CREATE ROLE leoverify_app LOGIN NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'leoverify_service') THEN
    CREATE ROLE leoverify_service LOGIN NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE postgres TO leoverify_app;
GRANT CONNECT ON DATABASE postgres TO leoverify_service;
GRANT USAGE ON SCHEMA public TO leoverify_app;
GRANT USAGE ON SCHEMA public TO leoverify_service;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO leoverify_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO leoverify_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO leoverify_service;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO leoverify_service;
GRANT leoverify_app TO CURRENT_USER;
GRANT leoverify_service TO CURRENT_USER;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO leoverify_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO leoverify_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO leoverify_service;

-- Drop the old permissive app-role bypass
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'District', 'Club', 'User', 'Event', 'CertificateTemplate',
    'Certificate', 'Recipient', 'AuditLog', 'ImportJob', 'ImportJobRow',
    'ClubCertSequence'
  ]
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS leoverify_app_dml ON %I', t);
    EXCEPTION
      WHEN undefined_table THEN NULL;
    END;
  END LOOP;
END
$$;

-- Service role: public reads. Signup writes go through signup_public_org.
DROP POLICY IF EXISTS service_district_all ON "District";
DROP POLICY IF EXISTS service_district_select ON "District";
DROP POLICY IF EXISTS service_club_select ON "Club";
DROP POLICY IF EXISTS service_club_insert ON "Club";
DROP POLICY IF EXISTS service_user_select ON "User";
DROP POLICY IF EXISTS service_user_insert ON "User";
DROP POLICY IF EXISTS service_event_select ON "Event";
DROP POLICY IF EXISTS service_template_select ON "CertificateTemplate";
DROP POLICY IF EXISTS service_certificate_select ON "Certificate";
DROP POLICY IF EXISTS service_recipient_select ON "Recipient";
DROP POLICY IF EXISTS service_audit_insert ON "AuditLog";

CREATE POLICY service_district_select ON "District"
  FOR SELECT TO leoverify_service
  USING (true);

CREATE POLICY service_club_select ON "Club"
  FOR SELECT TO leoverify_service
  USING (true);

CREATE POLICY service_user_select ON "User"
  FOR SELECT TO leoverify_service
  USING (true);

DROP POLICY IF EXISTS service_user_heal_id ON "User";
CREATE POLICY service_user_heal_id ON "User"
  FOR UPDATE TO leoverify_service
  USING (true)
  WITH CHECK (true);
GRANT UPDATE ("supabaseId", "updatedAt") ON "User" TO leoverify_service;

CREATE POLICY service_event_select ON "Event"
  FOR SELECT TO leoverify_service
  USING (true);

CREATE POLICY service_template_select ON "CertificateTemplate"
  FOR SELECT TO leoverify_service
  USING (true);

CREATE POLICY service_certificate_select ON "Certificate"
  FOR SELECT TO leoverify_service
  USING (true);

REVOKE SELECT ON "Certificate" FROM leoverify_service;
GRANT SELECT (
  id,
  "uniqueId",
  "clubId",
  "eventId",
  "recipientName",
  role,
  achievement,
  "issueDate",
  status,
  "recipientId",
  unlisted,
  "pdfUrl",
  "pdfKey",
  "tokenVersion",
  "createdAt",
  "updatedAt"
) ON "Certificate" TO leoverify_service;

GRANT EXECUTE ON FUNCTION public.recipient_id_for_email(text) TO leoverify_app;
GRANT EXECUTE ON FUNCTION public.club_in_scope(text) TO leoverify_app;
GRANT EXECUTE ON FUNCTION public.import_job_actor_supabase_id(text) TO leoverify_service;
GRANT EXECUTE ON FUNCTION public.import_job_actor_supabase_id(text) TO leoverify_app;
GRANT EXECUTE ON FUNCTION public.signup_public_org(text, text, text, text, text) TO leoverify_service;

CREATE POLICY service_recipient_select ON "Recipient"
  FOR SELECT TO leoverify_service
  USING (true);

-- ALTER ROLE leoverify_app PASSWORD 'generate-a-long-random-password';
-- ALTER ROLE leoverify_service PASSWORD 'generate-a-long-random-password';
-- DATABASE_URL=postgresql://leoverify_app:PASSWORD@…pooler…:6543/postgres?pgbouncer=true
-- SERVICE_DATABASE_URL=postgresql://leoverify_service:PASSWORD@…pooler…:6543/postgres?pgbouncer=true
