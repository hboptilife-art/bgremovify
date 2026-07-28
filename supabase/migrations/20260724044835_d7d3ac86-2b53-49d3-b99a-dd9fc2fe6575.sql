INSERT INTO public.platform_settings (key, value, updated_at)
VALUES ('free_slow_lane_enabled', 'true'::jsonb, now())
ON CONFLICT (key) DO NOTHING;