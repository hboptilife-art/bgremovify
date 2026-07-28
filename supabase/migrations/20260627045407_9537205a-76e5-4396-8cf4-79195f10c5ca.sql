CREATE TABLE public.anon_free_trial_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_anon_free_trial_ip_time ON public.anon_free_trial_usage (ip_hash, created_at DESC);
GRANT ALL ON public.anon_free_trial_usage TO service_role;
ALTER TABLE public.anon_free_trial_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON public.anon_free_trial_usage FOR ALL TO service_role USING (true) WITH CHECK (true);