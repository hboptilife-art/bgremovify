ALTER TABLE public.iyzico_orders
  ALTER COLUMN amount SET DEFAULT 0,
  ALTER COLUMN currency SET DEFAULT 'TRY',
  ALTER COLUMN display_amount SET DEFAULT 0,
  ALTER COLUMN display_currency SET DEFAULT 'TRY';