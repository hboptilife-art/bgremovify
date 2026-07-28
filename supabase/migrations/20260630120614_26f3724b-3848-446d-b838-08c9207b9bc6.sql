ALTER TABLE public.kaspi_orders
  ADD COLUMN IF NOT EXISTS requested_credits integer NOT NULL DEFAULT 100;