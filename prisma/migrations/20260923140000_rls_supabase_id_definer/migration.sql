-- current_supabase_id() is used from Recipient policies as the table owner
-- of the query (leoverify_app). auth.uid() lives in schema auth, which that
-- role cannot use. Prefer the Prisma GUC and run as SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.current_app_user()
RETURNS "User"
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM "User"
  WHERE "supabaseId" = COALESCE(
    NULLIF(current_setting('app.current_supabase_id', true), ''),
    auth.uid()::text
  )
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_supabase_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_supabase_id', true), ''),
    auth.uid()::text
  );
$$;
