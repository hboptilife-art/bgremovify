CREATE TABLE public.iyzico_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL UNIQUE,
  plan_id TEXT NOT NULL,
  credits INTEGER NOT NULL,
  amount_try NUMERIC(10, 2) NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  iyzico_token TEXT,
  iyzico_payment_id TEXT,
  error_message TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.iyzico_orders TO authenticated;
GRANT ALL ON public.iyzico_orders TO service_role;

ALTER TABLE public.iyzico_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own iyzico orders"
  ON public.iyzico_orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_iyzico_orders_user_id ON public.iyzico_orders(user_id);
CREATE INDEX idx_iyzico_orders_token ON public.iyzico_orders(iyzico_token);
CREATE INDEX idx_iyzico_orders_status ON public.iyzico_orders(status);

CREATE TRIGGER iyzico_orders_set_updated_at
  BEFORE UPDATE ON public.iyzico_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();