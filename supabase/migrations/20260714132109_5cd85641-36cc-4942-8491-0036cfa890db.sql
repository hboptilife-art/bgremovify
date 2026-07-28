-- feedback_events tablosunda GRANT'lar yoktu; service_role bile yazamıyordu.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_events TO authenticated;
GRANT ALL ON public.feedback_events TO service_role;

-- Geçmişte başarılı olmuş iyzico ödemelerini geri dönük panele işle
INSERT INTO public.feedback_events (kind, severity, source, title, user_id, metadata, created_at, updated_at)
SELECT
  'payment',
  'success',
  'iyzico',
  'Ödeme başarılı: ' || o.credits || ' kredi · ' || o.amount_try || '₺',
  o.user_id,
  jsonb_build_object(
    'order_id', o.id,
    'payment_id', o.iyzico_payment_id,
    'amount_try', o.amount_try,
    'credits', o.credits,
    'backfilled', true
  ),
  COALESCE(o.completed_at, o.created_at),
  COALESCE(o.completed_at, o.created_at)
FROM public.iyzico_orders o
WHERE o.status = 'success'
  AND NOT EXISTS (
    SELECT 1 FROM public.feedback_events fe
    WHERE fe.source = 'iyzico'
      AND (fe.metadata->>'order_id') = o.id::text
  );