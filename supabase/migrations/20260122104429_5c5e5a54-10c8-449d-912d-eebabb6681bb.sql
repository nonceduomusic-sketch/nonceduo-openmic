-- 1) Public section flags: expose only minimal info, keep internal config private
CREATE TABLE IF NOT EXISTS public.section_public_settings (
  section_key text PRIMARY KEY,
  display_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.section_public_settings ENABLE ROW LEVEL SECURITY;

-- Public can read ONLY the public flags
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='section_public_settings' AND policyname='Anyone can view public section settings'
  ) THEN
    CREATE POLICY "Anyone can view public section settings"
    ON public.section_public_settings
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- No direct writes from clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='section_public_settings' AND policyname='No direct writes to public section settings'
  ) THEN
    CREATE POLICY "No direct writes to public section settings"
    ON public.section_public_settings
    FOR ALL
    USING (false)
    WITH CHECK (false);
  END IF;
END $$;

-- Sync trigger: whenever section_settings changes, update the public mirror
CREATE OR REPLACE FUNCTION public.sync_section_public_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.section_public_settings (section_key, display_name, is_enabled, updated_at)
  VALUES (NEW.section_key, NEW.display_name, COALESCE(NEW.is_enabled, true), now())
  ON CONFLICT (section_key)
  DO UPDATE SET
    display_name = EXCLUDED.display_name,
    is_enabled = EXCLUDED.is_enabled,
    updated_at = now();

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_section_public_settings'
  ) THEN
    CREATE TRIGGER trg_sync_section_public_settings
    AFTER INSERT OR UPDATE ON public.section_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_section_public_settings();
  END IF;
END $$;

-- Tighten exposure: section_settings no longer publicly readable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='section_settings' AND policyname='Anyone can view section settings'
  ) THEN
    DROP POLICY "Anyone can view section settings" ON public.section_settings;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='section_settings' AND policyname='Authenticated can view section settings'
  ) THEN
    CREATE POLICY "Authenticated can view section settings"
    ON public.section_settings
    FOR SELECT
    USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 2) Harden admin credential tables: revoke privileges from client roles
REVOKE ALL ON TABLE public.admin_users FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_users FROM anon;
REVOKE ALL ON TABLE public.admin_users FROM authenticated;

REVOKE ALL ON TABLE public.password_reset_tokens FROM PUBLIC;
REVOKE ALL ON TABLE public.password_reset_tokens FROM anon;
REVOKE ALL ON TABLE public.password_reset_tokens FROM authenticated;
