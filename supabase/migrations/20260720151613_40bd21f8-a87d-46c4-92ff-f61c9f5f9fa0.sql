
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS rating smallint;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_rating_range;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_range CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

GRANT INSERT ON public.reviews TO anon, authenticated;

DROP POLICY IF EXISTS "reviews public submit pending" ON public.reviews;
CREATE POLICY "reviews public submit pending"
  ON public.reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending' AND approved_at IS NULL AND approved_by IS NULL);
