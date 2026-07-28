CREATE OR REPLACE FUNCTION public.consume_credit()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid UUID := auth.uid();
  remaining INTEGER;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF public.has_role(uid, 'admin') THEN
    SELECT credits INTO remaining
    FROM public.user_credits
    WHERE user_id = uid;

    IF remaining IS NULL THEN
      INSERT INTO public.user_credits (user_id, credits)
      VALUES (uid, 0)
      RETURNING credits INTO remaining;
    END IF;

    RETURN remaining;
  END IF;

  UPDATE public.user_credits
  SET credits = credits - 1,
      total_used = total_used + 1,
      updated_at = now()
  WHERE user_id = uid AND credits > 0
  RETURNING credits INTO remaining;

  IF remaining IS NULL THEN
    RAISE EXCEPTION 'no_credits';
  END IF;

  RETURN remaining;
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_credits(_n integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  IF public.has_role(uid, 'admin') THEN
    SELECT credits INTO remaining
    FROM public.user_credits
    WHERE user_id = uid;

    IF remaining IS NULL THEN
      INSERT INTO public.user_credits (user_id, credits)
      VALUES (uid, 0)
      RETURNING credits INTO remaining;
    END IF;

    RETURN remaining;
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
$function$;

REVOKE ALL ON FUNCTION public.consume_credit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_credit() TO authenticated;

REVOKE ALL ON FUNCTION public.consume_credits(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_credits(integer) TO authenticated;