INSERT INTO public.global_format_settings (format_key, is_active, visible_on_app, visible_on_menu)
VALUES ('show_trasmetti_banner', false, false, false)
ON CONFLICT (format_key) DO NOTHING;