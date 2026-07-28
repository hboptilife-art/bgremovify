CREATE TABLE IF NOT EXISTS public.user_cutout_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  input_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'succeeded', 'failed')),
  result_data_url TEXT,
  error TEXT,
  model TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_cutout_jobs TO authenticated;
GRANT ALL ON public.user_cutout_jobs TO service_role;

ALTER TABLE public.user_cutout_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cutout jobs"
  ON public.user_cutout_jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cutout jobs"
  ON public.user_cutout_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cutout jobs"
  ON public.user_cutout_jobs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_cutout_jobs_lookup
  ON public.user_cutout_jobs (user_id, input_hash, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS user_cutout_jobs_active_input_unique
  ON public.user_cutout_jobs (user_id, input_hash)
  WHERE status IN ('processing', 'succeeded');

CREATE OR REPLACE FUNCTION public.touch_user_cutout_jobs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_user_cutout_jobs_updated_at ON public.user_cutout_jobs;
CREATE TRIGGER touch_user_cutout_jobs_updated_at
  BEFORE UPDATE ON public.user_cutout_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_user_cutout_jobs_updated_at();