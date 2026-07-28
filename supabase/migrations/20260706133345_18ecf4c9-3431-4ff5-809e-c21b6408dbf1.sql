
-- Freedom Pay orders (one-time payments + subscription initializations)
CREATE TABLE public.freedompay_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_type TEXT NOT NULL CHECK (order_type IN ('one_time', 'subscription_init')),
  plan_id TEXT,
  amount_kzt INTEGER NOT NULL CHECK (amount_kzt > 0),
  credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  pg_payment_id TEXT,
  pg_recurring_profile TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','cancelled','refunded')),
  description TEXT,
  webhook_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_freedompay_orders_user ON public.freedompay_orders(user_id, created_at DESC);
CREATE INDEX idx_freedompay_orders_pg_id ON public.freedompay_orders(pg_payment_id);
CREATE INDEX idx_freedompay_orders_status ON public.freedompay_orders(status);

GRANT SELECT ON public.freedompay_orders TO authenticated;
GRANT ALL ON public.freedompay_orders TO service_role;

ALTER TABLE public.freedompay_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own freedompay orders"
  ON public.freedompay_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_freedompay_orders_updated_at
  BEFORE UPDATE ON public.freedompay_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Active recurring subscriptions
CREATE TABLE public.freedompay_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  amount_kzt INTEGER NOT NULL CHECK (amount_kzt > 0),
  monthly_credits INTEGER NOT NULL CHECK (monthly_credits >= 0),
  pg_recurring_profile TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled','failed')),
  next_charge_at TIMESTAMPTZ,
  last_charge_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_freedompay_subs_user ON public.freedompay_subscriptions(user_id);
CREATE INDEX idx_freedompay_subs_status ON public.freedompay_subscriptions(status);
CREATE INDEX idx_freedompay_subs_next_charge ON public.freedompay_subscriptions(next_charge_at)
  WHERE status = 'active';

GRANT SELECT ON public.freedompay_subscriptions TO authenticated;
GRANT ALL ON public.freedompay_subscriptions TO service_role;

ALTER TABLE public.freedompay_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own freedompay subscriptions"
  ON public.freedompay_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_freedompay_subs_updated_at
  BEFORE UPDATE ON public.freedompay_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
