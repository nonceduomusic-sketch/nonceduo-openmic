-- Community-specific blocked users (separato da Dediche anonime)
CREATE TABLE IF NOT EXISTS public.community_blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  reason text,
  expires_at timestamp with time zone,
  blocked_at timestamp with time zone DEFAULT now(),
  blocked_by uuid
);

ALTER TABLE public.community_blocked_users ENABLE ROW LEVEL SECURITY;

-- Staff can manage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_blocked_users' AND policyname='Staff can manage community blocks'
  ) THEN
    CREATE POLICY "Staff can manage community blocks"
    ON public.community_blocked_users
    FOR ALL
    USING (
      is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)
    )
    WITH CHECK (
      is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)
    );
  END IF;
END $$;

-- Users can check own block status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_blocked_users' AND policyname='Users can view own community block status'
  ) THEN
    CREATE POLICY "Users can view own community block status"
    ON public.community_blocked_users
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;
