-- Add new format setting for showing/hiding live queue to users
INSERT INTO public.global_format_settings (format_key, is_active, updated_at)
VALUES ('show_live_queue', true, now())
ON CONFLICT (format_key) DO NOTHING;