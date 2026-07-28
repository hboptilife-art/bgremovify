REVOKE EXECUTE ON FUNCTION public.purge_stale_inference_jobs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_stale_inference_jobs() TO service_role;