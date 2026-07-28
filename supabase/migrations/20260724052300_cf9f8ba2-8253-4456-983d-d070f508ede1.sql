INSERT INTO public.platform_settings (key, value)
VALUES ('signup_credits', to_jsonb(0))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

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
    signup_credits := COALESCE((raw_val)::text::int, 0);
  EXCEPTION WHEN OTHERS THEN
    signup_credits := 0;
  END;
  IF signup_credits < 0 THEN signup_credits := 0; END IF;
  IF signup_credits > 1000 THEN signup_credits := 1000; END IF;

  INSERT INTO public.user_credits (user_id, credits)
  VALUES (NEW.id, signup_credits)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;