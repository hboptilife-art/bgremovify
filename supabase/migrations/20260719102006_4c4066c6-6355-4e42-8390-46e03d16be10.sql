CREATE TABLE public.inference_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prediction_id TEXT NOT NULL,
  kind TEXT NOT NULL, -- 'segment' | 'inpaint'
  engine TEXT NOT NULL,
  cost INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|succeeded|failed|charged
  mask_data TEXT, -- padded/expanded mask (data URL) for inpaint compositing
  is_admin_mock BOOLEAN NOT NULL DEFAULT false,
  credits_charged INT NOT NULL DEFAULT 0,
  error TEXT,
  result_data_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.inference_jobs TO authenticated;
GRANT ALL ON public.inference_jobs TO service_role;

ALTER TABLE public.inference_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own inference jobs select" ON public.inference_jobs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own inference jobs insert" ON public.inference_jobs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own inference jobs update" ON public.inference_jobs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX inference_jobs_user_created_idx ON public.inference_jobs (user_id, created_at DESC);
CREATE INDEX inference_jobs_status_idx ON public.inference_jobs (status) WHERE status = 'pending';

CREATE TRIGGER inference_jobs_set_updated
  BEFORE UPDATE ON public.inference_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.purge_stale_inference_jobs()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT;
BEGIN
  DELETE FROM public.inference_jobs
   WHERE created_at < now() - INTERVAL '24 hours';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;