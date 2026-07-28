
-- 1) Platform settings (key/value) — admin-configurable runtime rules
CREATE TABLE public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
-- Public read: settings are non-sensitive runtime rules (delay in ms, signup credits count).
CREATE POLICY "platform_settings public read"
  ON public.platform_settings FOR SELECT
  TO anon, authenticated
  USING (true);
-- Writes only via service_role (server functions using supabaseAdmin after admin check).

-- Seed defaults
INSERT INTO public.platform_settings (key, value) VALUES
  ('free_delay_ms', to_jsonb(80000)),
  ('signup_credits', to_jsonb(1))
ON CONFLICT (key) DO NOTHING;

-- 2) Reviews (Yorum Yönetimi) — dynamic, admin-approved
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  country TEXT NOT NULL,
  country_code TEXT NOT NULL,
  quote TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  sort_order INTEGER NOT NULL DEFAULT 0,
  submitted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved reviews (public site listing)
CREATE POLICY "reviews public read approved"
  ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

-- Admins can read every review (pending queue etc.)
CREATE POLICY "reviews admin read all"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- All writes go through service_role via admin server functions after has_role check.

CREATE TRIGGER reviews_set_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX reviews_status_idx ON public.reviews (status, sort_order DESC, created_at DESC);

-- 3) handle_new_user: read signup credit count from platform_settings (fallback 1)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  signup_credits INTEGER;
  raw_val JSONB;
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT value INTO raw_val FROM public.platform_settings WHERE key = 'signup_credits';
  BEGIN
    signup_credits := COALESCE((raw_val)::text::int, 1);
  EXCEPTION WHEN OTHERS THEN
    signup_credits := 1;
  END;
  IF signup_credits < 0 THEN signup_credits := 0; END IF;
  IF signup_credits > 1000 THEN signup_credits := 1000; END IF;

  INSERT INTO public.user_credits (user_id, credits)
  VALUES (NEW.id, signup_credits)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
