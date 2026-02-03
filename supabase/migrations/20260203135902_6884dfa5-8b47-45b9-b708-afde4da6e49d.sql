-- Insert new format settings for lyrics controls
INSERT INTO public.global_format_settings (format_key, is_active, updated_at)
VALUES 
  ('lyrics_zoom', true, now()),
  ('lyrics_highlight_arrows', true, now())
ON CONFLICT (format_key) DO NOTHING;