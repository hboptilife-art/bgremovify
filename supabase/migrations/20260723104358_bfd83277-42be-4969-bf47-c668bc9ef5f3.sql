ALTER TABLE public.anon_free_trial_usage
  ADD COLUMN IF NOT EXISTS input_hash TEXT,
  ADD COLUMN IF NOT EXISTS result_data_url TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'succeeded',
  ADD COLUMN IF NOT EXISTS error TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_anon_free_trial_input_status
  ON public.anon_free_trial_usage (ip_hash, input_hash, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS anon_free_trial_active_input_unique
  ON public.anon_free_trial_usage (ip_hash, input_hash)
  WHERE input_hash IS NOT NULL AND status IN ('processing', 'succeeded');