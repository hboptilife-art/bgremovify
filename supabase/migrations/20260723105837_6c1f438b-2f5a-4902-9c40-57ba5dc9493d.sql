UPDATE public.anon_free_trial_usage
SET status = 'failed',
    error = COALESCE(error, 'stale_processing_lock'),
    updated_at = now()
WHERE status = 'processing'
  AND updated_at < now() - interval '2 minutes';

UPDATE public.user_cutout_jobs
SET status = 'failed',
    error = COALESCE(error, 'stale_processing_lock')
WHERE status = 'processing'
  AND updated_at < now() - interval '2 minutes';

DROP INDEX IF EXISTS public.anon_free_trial_active_input_unique;
CREATE UNIQUE INDEX IF NOT EXISTS anon_free_trial_active_input_unique
  ON public.anon_free_trial_usage (ip_hash, input_hash)
  WHERE input_hash IS NOT NULL AND status = 'processing';

DROP INDEX IF EXISTS public.user_cutout_jobs_active_input_unique;
CREATE UNIQUE INDEX IF NOT EXISTS user_cutout_jobs_active_input_unique
  ON public.user_cutout_jobs (user_id, input_hash)
  WHERE status = 'processing';