
CREATE TABLE public.user_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  data_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_templates TO authenticated;
GRANT ALL ON public.user_templates TO service_role;

ALTER TABLE public.user_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_select" ON public.user_templates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.user_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.user_templates FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.user_templates FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX user_templates_user_created_idx ON public.user_templates (user_id, created_at DESC);

CREATE TRIGGER user_templates_touch_updated_at
  BEFORE UPDATE ON public.user_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.purge_stale_user_templates()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE n integer;
BEGIN
  DELETE FROM public.user_templates ut
  WHERE ut.created_at < now() - interval '5 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.iyzico_orders io
      WHERE io.user_id = ut.user_id AND io.status = 'completed'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.kaspi_orders ko
      WHERE ko.user_id = ut.user_id AND ko.status = 'completed'
    );
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
