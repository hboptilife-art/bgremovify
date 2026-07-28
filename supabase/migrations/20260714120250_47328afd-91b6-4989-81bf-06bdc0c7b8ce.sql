
-- 1) Table
CREATE TABLE public.feedback_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('payment','ai_error','user_feedback','system_error')),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','error','success')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','archived')),
  source TEXT,
  title TEXT NOT NULL,
  detail TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_events_status_created ON public.feedback_events (status, created_at DESC);
CREATE INDEX idx_feedback_events_kind_created ON public.feedback_events (kind, created_at DESC);
CREATE INDEX idx_feedback_events_user ON public.feedback_events (user_id);

-- 2) Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_events TO authenticated;
GRANT ALL ON public.feedback_events TO service_role;

-- 3) RLS
ALTER TABLE public.feedback_events ENABLE ROW LEVEL SECURITY;

-- Admins: full read
CREATE POLICY "feedback_events_admin_read"
  ON public.feedback_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins: full update
CREATE POLICY "feedback_events_admin_update"
  ON public.feedback_events FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins: delete
CREATE POLICY "feedback_events_admin_delete"
  ON public.feedback_events FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated: insert their own user_feedback rows
CREATE POLICY "feedback_events_user_insert_own_feedback"
  ON public.feedback_events FOR INSERT TO authenticated
  WITH CHECK (
    kind = 'user_feedback'
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- 4) updated_at trigger (reuse existing set_updated_at)
CREATE TRIGGER trg_feedback_events_updated_at
  BEFORE UPDATE ON public.feedback_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) Auto-archive function (used by pg_cron and manually)
CREATE OR REPLACE FUNCTION public.archive_stale_feedback_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INTEGER := 0;
  tmp INTEGER;
BEGIN
  -- Successful payments: archive after 24h
  UPDATE public.feedback_events
    SET status = 'archived', archived_at = now()
  WHERE status <> 'archived'
    AND kind = 'payment'
    AND severity = 'success'
    AND created_at < now() - INTERVAL '24 hours';
  GET DIAGNOSTICS tmp = ROW_COUNT; n := n + tmp;

  -- Resolved feedback: archive 48h after resolution
  UPDATE public.feedback_events
    SET status = 'archived', archived_at = now()
  WHERE status = 'resolved'
    AND resolved_at IS NOT NULL
    AND resolved_at < now() - INTERVAL '48 hours';
  GET DIAGNOSTICS tmp = ROW_COUNT; n := n + tmp;

  -- Errors (ai/system/payment failures): archive after 7 days
  UPDATE public.feedback_events
    SET status = 'archived', archived_at = now()
  WHERE status <> 'archived'
    AND severity IN ('error','warning')
    AND kind IN ('ai_error','system_error','payment')
    AND created_at < now() - INTERVAL '7 days';
  GET DIAGNOSTICS tmp = ROW_COUNT; n := n + tmp;

  -- Any open item untouched for 48h+ (ignored): archive
  UPDATE public.feedback_events
    SET status = 'archived', archived_at = now()
  WHERE status = 'open'
    AND updated_at < now() - INTERVAL '48 hours';
  GET DIAGNOSTICS tmp = ROW_COUNT; n := n + tmp;

  -- Hard delete archived rows older than 30 days
  DELETE FROM public.feedback_events
  WHERE status = 'archived'
    AND archived_at IS NOT NULL
    AND archived_at < now() - INTERVAL '30 days';

  RETURN n;
END;
$$;

-- 6) Enable pg_cron and schedule hourly
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'archive-stale-feedback-events',
  '15 * * * *',
  $$ SELECT public.archive_stale_feedback_events(); $$
);
