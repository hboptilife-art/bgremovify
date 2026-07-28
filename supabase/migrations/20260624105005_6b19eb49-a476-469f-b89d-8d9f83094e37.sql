CREATE OR REPLACE FUNCTION public.consume_credits(_n integer)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  remaining INTEGER;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF _n IS NULL OR _n < 1 OR _n > 10 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  UPDATE public.user_credits
  SET credits = credits - _n,
      total_used = total_used + _n,
      updated_at = now()
  WHERE user_id = uid AND credits >= _n
  RETURNING credits INTO remaining;

  IF remaining IS NULL THEN
    RAISE EXCEPTION 'no_credits';
  END IF;

  RETURN remaining;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_credits(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_credits(integer) TO authenticated;