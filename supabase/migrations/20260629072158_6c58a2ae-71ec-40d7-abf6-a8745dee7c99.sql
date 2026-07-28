REVOKE ALL ON FUNCTION public.is_billing_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_billing_admin(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.protect_admin_credit_balance() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_admin_credit_balance() TO service_role;