
CREATE TABLE public.kaspi_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  holder_name text NOT NULL,
  holder_name_normalized text NOT NULL,
  amount_kzt integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','expired','cancelled')),
  credits_granted integer NOT NULL DEFAULT 0,
  sms_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX kaspi_orders_match_idx
  ON public.kaspi_orders (holder_name_normalized, amount_kzt, status, created_at DESC);
CREATE INDEX kaspi_orders_user_idx
  ON public.kaspi_orders (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.kaspi_orders TO authenticated;
GRANT ALL ON public.kaspi_orders TO service_role;

ALTER TABLE public.kaspi_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY own_orders_select ON public.kaspi_orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY own_orders_insert ON public.kaspi_orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
