-- Break Certificate ↔ Recipient RLS recursion via SECURITY DEFINER helpers.

CREATE OR REPLACE FUNCTION public.current_recipient_ids()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM "Recipient"
  WHERE "supabaseId" = public.current_supabase_id();
$$;

CREATE OR REPLACE FUNCTION public.current_recipient_emails()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM "Recipient"
  WHERE "supabaseId" = public.current_supabase_id();
$$;

DROP POLICY IF EXISTS certificate_recipient_select ON "Certificate";
DROP POLICY IF EXISTS certificate_recipient_update ON "Certificate";

CREATE POLICY certificate_recipient_select ON "Certificate"
  FOR SELECT
  USING (
    "recipientEmail" IN (SELECT public.current_recipient_emails())
    OR "recipientId" IN (SELECT public.current_recipient_ids())
  );

CREATE POLICY certificate_recipient_update ON "Certificate"
  FOR UPDATE
  USING (
    "recipientEmail" IN (SELECT public.current_recipient_emails())
    OR "recipientId" IN (SELECT public.current_recipient_ids())
    OR (
      "recipientId" IS NULL
      AND lower("recipientEmail") IN (
        SELECT lower(e) FROM public.current_recipient_emails() AS e
      )
    )
  )
  WITH CHECK (
    "recipientEmail" IN (SELECT public.current_recipient_emails())
    OR "recipientId" IN (SELECT public.current_recipient_ids())
  );
