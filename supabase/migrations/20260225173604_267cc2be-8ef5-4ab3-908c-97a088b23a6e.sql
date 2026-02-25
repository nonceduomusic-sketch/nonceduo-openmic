-- Insert community_registration toggle into global_format_settings if not exists
INSERT INTO public.global_format_settings (format_key, is_active, visible_on_app, visible_on_menu)
VALUES ('community_registration', true, true, true)
ON CONFLICT (format_key) DO NOTHING;