-- Ensure section_settings has default rows for core sections (idempotent)
INSERT INTO public.section_settings (section_key, display_name, description, is_enabled)
VALUES
  ('openmic', 'Open Mic', 'Prenotazioni canzoni e coda serata', true),
  ('dediche', 'Dediche', 'Messaggi e gruppi temporanei per la serata', true),
  ('community', 'Community', 'Community con login e gruppi permanenti', true)
ON CONFLICT (section_key) DO NOTHING;

-- Optional: ensure updated_at is bumped automatically on UPDATE
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_section_settings_updated_at'
  ) THEN
    CREATE TRIGGER trg_section_settings_updated_at
    BEFORE UPDATE ON public.section_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
