
-- 1) Lock down SECURITY DEFINER functions: revoke from PUBLIC/anon/authenticated where appropriate

-- Trigger functions: nobody should call these directly; triggers run as definer regardless
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_assign_admin() FROM PUBLIC, anon, authenticated;

-- has_role: needed by RLS policies for signed-in users; revoke from anon and PUBLIC
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- consume_credit: called by signed-in users only
REVOKE ALL ON FUNCTION public.consume_credit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_credit() TO authenticated;

-- 2) Tighten analytics_events INSERT policy: no WITH CHECK (true) anymore.
-- Anonymous tracking is still allowed (user_id IS NULL), but no one can spoof another user's id.
DROP POLICY IF EXISTS "Anyone can insert events" ON public.analytics_events;

CREATE POLICY "Anyone can insert events"
ON public.analytics_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);
