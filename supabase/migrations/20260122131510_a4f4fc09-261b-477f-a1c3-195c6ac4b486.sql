-- Consenti il toggle dei format (section_settings.is_enabled) anche a staff non-owner tramite permesso granularo.
-- Prima era legato a settings.rename_sections, ora usiamo settings.edit (più coerente: edit impostazioni).

DO $$
BEGIN
  -- Rimuovi policy precedente se esiste
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'section_settings'
      AND policyname = 'Owners and authorized admins can update section settings'
  ) THEN
    EXECUTE 'DROP POLICY "Owners and authorized admins can update section settings" ON public.section_settings';
  END IF;
END $$;

CREATE POLICY "Owners and authorized staff can update section settings"
ON public.section_settings
FOR UPDATE
USING (
  is_owner(auth.uid()) OR has_permission(auth.uid(), 'settings.edit')
)
WITH CHECK (
  is_owner(auth.uid()) OR has_permission(auth.uid(), 'settings.edit')
);
