CREATE OR REPLACE FUNCTION public.is_billing_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM auth.users
      WHERE id = _user_id
        AND lower(email) IN ('finance@bgremovify.com')
    );
$function$;

CREATE OR REPLACE FUNCTION public.consume_credit()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  uid UUID := auth.uid();
  remaining INTEGER;
  billing_admin BOOLEAN := false;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = uid
        AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM auth.users
      WHERE id = uid
        AND lower(email) IN ('finance@bgremovify.com')
    )
  INTO billing_admin;

  IF billing_admin THEN
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
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  uid UUID := auth.uid();
  remaining INTEGER;
  billing_admin BOOLEAN := false;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF _n IS NULL OR _n < 1 OR _n > 10 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = uid
        AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM auth.users
      WHERE id = uid
        AND lower(email) IN ('finance@bgremovify.com')
    )
  INTO billing_admin;

  IF billing_admin THEN
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

CREATE OR REPLACE FUNCTION public.protect_admin_credit_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  billing_admin BOOLEAN := false;
BEGIN
  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = OLD.user_id
        AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM auth.users
      WHERE id = OLD.user_id
        AND lower(email) IN ('finance@bgremovify.com')
    )
  INTO billing_admin;

  IF billing_admin THEN
    IF NEW.credits < OLD.credits THEN
      NEW.credits := OLD.credits;
    END IF;

    IF NEW.total_used > OLD.total_used THEN
      NEW.total_used := OLD.total_used;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS protect_admin_credit_balance_before_update ON public.user_credits;
CREATE TRIGGER protect_admin_credit_balance_before_update
BEFORE UPDATE ON public.user_credits
FOR EACH ROW
EXECUTE FUNCTION public.protect_admin_credit_balance();

REVOKE ALL ON FUNCTION public.is_billing_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_billing_admin(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.protect_admin_credit_balance() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_admin_credit_balance() TO service_role;

REVOKE ALL ON FUNCTION public.consume_credit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_credit() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.consume_credits(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_credits(integer) TO authenticated, service_role;