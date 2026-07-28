ALTER TABLE public.iyzico_orders
  ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS currency TEXT,
  ADD COLUMN IF NOT EXISTS display_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS display_currency TEXT,
  ADD COLUMN IF NOT EXISTS fx_rate NUMERIC(18, 8);

UPDATE public.iyzico_orders
SET
  amount = COALESCE(amount, amount_try),
  currency = COALESCE(currency, 'TRY'),
  display_amount = COALESCE(display_amount, amount_try),
  display_currency = COALESCE(display_currency, 'TRY')
WHERE amount IS NULL OR currency IS NULL OR display_amount IS NULL OR display_currency IS NULL;

ALTER TABLE public.iyzico_orders
  ALTER COLUMN amount SET NOT NULL,
  ALTER COLUMN currency SET NOT NULL,
  ALTER COLUMN display_amount SET NOT NULL,
  ALTER COLUMN display_currency SET NOT NULL;

ALTER TABLE public.iyzico_orders
  DROP CONSTRAINT IF EXISTS iyzico_orders_currency_check,
  ADD CONSTRAINT iyzico_orders_currency_check CHECK (currency IN ('TRY', 'USD', 'EUR', 'GBP', 'NOK', 'CHF'));

ALTER TABLE public.iyzico_orders
  DROP CONSTRAINT IF EXISTS iyzico_orders_display_currency_check,
  ADD CONSTRAINT iyzico_orders_display_currency_check CHECK (display_currency IN ('TRY', 'USD', 'EUR', 'GBP', 'NOK', 'CHF', 'KZT', 'UZS', 'KGS', 'RUB', 'AZN', 'CAD', 'AED', 'SAR'));

CREATE INDEX IF NOT EXISTS idx_iyzico_orders_currency ON public.iyzico_orders(currency);