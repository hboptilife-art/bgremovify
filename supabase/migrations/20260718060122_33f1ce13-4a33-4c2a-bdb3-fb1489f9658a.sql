CREATE TABLE public.signup_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip TEXT NOT NULL,
  throttled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX signup_ips_ip_idx ON public.signup_ips(ip);
CREATE UNIQUE INDEX signup_ips_user_id_uidx ON public.signup_ips(user_id);

GRANT ALL ON public.signup_ips TO service_role;

ALTER TABLE public.signup_ips ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated — only the service role (server functions) touches this table.