-- Admin audit log table (staff-only read)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  -- who performed the action
  actor_user_id uuid,
  actor_role public.app_role,
  actor_email text,

  -- what happened
  action text NOT NULL,
  entity text,
  entity_id text,
  section text,

  -- free-form details for debugging/traceability (no secrets)
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_user_id ON public.admin_audit_logs (actor_user_id);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Staff can view audit logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='admin_audit_logs' AND policyname='Staff can view audit logs'
  ) THEN
    CREATE POLICY "Staff can view audit logs"
    ON public.admin_audit_logs
    FOR SELECT
    USING (
      public.is_owner(auth.uid())
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'moderator'::public.app_role)
    );
  END IF;
END $$;

-- No direct writes from client (writes should be done via privileged backend functions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='admin_audit_logs' AND policyname='No direct writes to audit logs'
  ) THEN
    CREATE POLICY "No direct writes to audit logs"
    ON public.admin_audit_logs
    FOR ALL
    USING (false)
    WITH CHECK (false);
  END IF;
END $$;