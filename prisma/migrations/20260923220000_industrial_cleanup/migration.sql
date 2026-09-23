-- club_in_scope helper, ImportJobRow.clubId, signup DEFINER, service-role writes revoked.

CREATE OR REPLACE FUNCTION public.club_in_scope(target_club_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT target_club_id = public.current_user_club_id()
      OR (
        public.current_user_role() = 'district_admin'
        AND EXISTS (
          SELECT 1 FROM "Club"
          WHERE id = target_club_id
            AND "districtId" = public.current_user_district_id()
        )
      );
$$;

REVOKE ALL ON FUNCTION public.club_in_scope(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_in_scope(text) TO leoverify_app;

DROP POLICY IF EXISTS event_club_access ON "Event";
CREATE POLICY event_club_access ON "Event"
  FOR ALL
  USING (public.club_in_scope("clubId"))
  WITH CHECK (public.club_in_scope("clubId"));

DROP POLICY IF EXISTS template_club_access ON "CertificateTemplate";
CREATE POLICY template_club_access ON "CertificateTemplate"
  FOR ALL
  USING (public.club_in_scope("clubId"))
  WITH CHECK (public.club_in_scope("clubId"));

DROP POLICY IF EXISTS certificate_club_access ON "Certificate";
CREATE POLICY certificate_club_access ON "Certificate"
  FOR ALL
  USING (public.club_in_scope("clubId"))
  WITH CHECK (public.club_in_scope("clubId"));

DROP POLICY IF EXISTS audit_select ON "AuditLog";
CREATE POLICY audit_select ON "AuditLog"
  FOR SELECT
  USING (public.club_in_scope("clubId"));

DROP POLICY IF EXISTS recipient_club_select ON "Recipient";
CREATE POLICY recipient_club_select ON "Recipient"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Certificate" c
      WHERE c."recipientId" = "Recipient".id
        AND public.club_in_scope(c."clubId")
    )
  );

DROP POLICY IF EXISTS import_job_club_access ON "ImportJob";
CREATE POLICY import_job_club_access ON "ImportJob"
  FOR ALL
  USING (public.club_in_scope("clubId"))
  WITH CHECK (public.club_in_scope("clubId"));

DROP POLICY IF EXISTS sequence_club_access ON "ClubCertSequence";
CREATE POLICY sequence_club_access ON "ClubCertSequence"
  FOR ALL
  USING (public.club_in_scope("clubId"))
  WITH CHECK (public.club_in_scope("clubId"));

ALTER TABLE "ImportJobRow" ADD COLUMN "clubId" text;
UPDATE "ImportJobRow" r
SET "clubId" = j."clubId"
FROM "ImportJob" j
WHERE j.id = r."jobId";
ALTER TABLE "ImportJobRow" ALTER COLUMN "clubId" SET NOT NULL;
ALTER TABLE "ImportJobRow"
  ADD CONSTRAINT "ImportJobRow_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "Club"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "ImportJobRow_clubId_idx" ON "ImportJobRow" ("clubId");

DROP POLICY IF EXISTS import_job_row_club_access ON "ImportJobRow";
CREATE POLICY import_job_row_club_access ON "ImportJobRow"
  FOR ALL
  USING (public.club_in_scope("clubId"))
  WITH CHECK (public.club_in_scope("clubId"));

CREATE OR REPLACE FUNCTION public.signup_public_org(
  p_supabase_id text,
  p_email text,
  p_org_name text,
  p_org_code text,
  p_admin_name text
)
RETURNS TABLE (club_id text, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_code text := upper(trim(p_org_code));
  v_district_id text;
  v_club_id text;
  v_user_id text;
  v_base_slug text;
  v_slug text;
  v_n int := 1;
BEGIN
  IF EXISTS (SELECT 1 FROM "User" WHERE lower(email) = v_email) THEN
    RETURN QUERY SELECT NULL::text, 'An account with this email already exists. Contact support if this is unexpected.'::text;
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM "User" WHERE "supabaseId" = p_supabase_id) THEN
    RETURN QUERY SELECT NULL::text, 'This account is already linked to an organization.'::text;
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM "Club" WHERE code = v_code) THEN
    RETURN QUERY SELECT NULL::text, 'Organization code already taken'::text;
    RETURN;
  END IF;

  SELECT id INTO v_district_id FROM "District" WHERE code = 'PUBLIC';
  IF v_district_id IS NULL THEN
    v_district_id := concat('d', substr(replace(gen_random_uuid()::text, '-', ''), 1, 24));
    INSERT INTO "District" (id, name, code, "createdAt", "updatedAt")
    VALUES (v_district_id, 'Public organizations', 'PUBLIC', now(), now());
  END IF;

  v_base_slug := trim(both '-' from lower(regexp_replace(p_org_name, '[^a-zA-Z0-9]+', '-', 'g')));
  IF v_base_slug = '' THEN
    v_base_slug := trim(both '-' from lower(regexp_replace(v_code, '[^a-zA-Z0-9]+', '-', 'g')));
  END IF;
  v_base_slug := left(v_base_slug, 48);
  v_slug := v_base_slug;
  WHILE EXISTS (SELECT 1 FROM "Club" WHERE "publicSlug" = v_slug) LOOP
    v_slug := left(v_base_slug || '-' || v_n::text, 48);
    v_n := v_n + 1;
  END LOOP;

  v_club_id := concat('c', substr(replace(gen_random_uuid()::text, '-', ''), 1, 24));
  INSERT INTO "Club" (
    id, "districtId", name, code, type, plan, "monthlyCertLimit",
    "publicSlug", "primaryColor", "accentColor", "createdAt", "updatedAt"
  ) VALUES (
    v_club_id, v_district_id, p_org_name, v_code, 'public', 'free', 100,
    v_slug, '#323232', '#38a3e3', now(), now()
  );

  v_user_id := concat('u', substr(replace(gen_random_uuid()::text, '-', ''), 1, 24));
  INSERT INTO "User" (
    id, "supabaseId", email, name, role, "clubId", "districtId", "createdAt", "updatedAt"
  ) VALUES (
    v_user_id, p_supabase_id, v_email, p_admin_name, 'club_admin',
    v_club_id, v_district_id, now(), now()
  );

  INSERT INTO "AuditLog" (id, action, "targetType", "targetId", "clubId", metadata, "createdAt")
  VALUES (
    concat('a', substr(replace(gen_random_uuid()::text, '-', ''), 1, 24)),
    'club.create',
    'Club',
    v_club_id,
    v_club_id,
    jsonb_build_object('type', 'public', 'monthlyCertLimit', 100),
    now()
  );

  RETURN QUERY SELECT v_club_id, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.signup_public_org(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.signup_public_org(text, text, text, text, text) TO leoverify_service;

REVOKE INSERT, UPDATE ON "District", "Club", "User", "AuditLog" FROM leoverify_service;

DROP POLICY IF EXISTS service_district_all ON "District";
DROP POLICY IF EXISTS service_club_insert ON "Club";
DROP POLICY IF EXISTS service_user_insert ON "User";
DROP POLICY IF EXISTS service_audit_insert ON "AuditLog";

DROP POLICY IF EXISTS service_district_select ON "District";
CREATE POLICY service_district_select ON "District"
  FOR SELECT TO leoverify_service
  USING (true);
