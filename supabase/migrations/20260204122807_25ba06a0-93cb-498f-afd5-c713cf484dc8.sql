-- Add show_upcoming_events flag to global_format_settings
INSERT INTO public.global_format_settings (format_key, is_active, updated_at)
VALUES ('show_upcoming_events', false, now())
ON CONFLICT (format_key) DO NOTHING;