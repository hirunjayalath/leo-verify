CREATE OR REPLACE FUNCTION public.import_job_actor_supabase_id(job_id text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u."supabaseId"
  FROM "ImportJob" j
  JOIN "User" u ON u.id = j."createdById"
  WHERE j.id = job_id
$$;

REVOKE ALL ON FUNCTION public.import_job_actor_supabase_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_job_actor_supabase_id(text) TO leoverify_service;
GRANT EXECUTE ON FUNCTION public.import_job_actor_supabase_id(text) TO leoverify_app;
