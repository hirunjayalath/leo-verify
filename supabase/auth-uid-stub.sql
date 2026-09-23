-- Plain Postgres (CI / local) has no Supabase auth schema.
-- LANGUAGE sql helpers in Prisma migrations reference auth.uid() at CREATE time.
-- On real Supabase this is a no-op: schema auth already exists.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    EXECUTE 'CREATE SCHEMA auth';
    EXECUTE $fn$
      CREATE FUNCTION auth.uid()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      AS $body$ SELECT NULL::uuid $body$
    $fn$;
  END IF;
END
$$;
