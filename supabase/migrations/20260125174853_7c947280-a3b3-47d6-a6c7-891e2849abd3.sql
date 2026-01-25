-- Add voting setting to global_format_settings
INSERT INTO public.global_format_settings (format_key, is_active, updated_at)
VALUES ('voting', true, now())
ON CONFLICT (format_key) DO NOTHING;