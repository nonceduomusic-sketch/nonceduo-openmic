-- Add auto-scroll setting to global format settings
INSERT INTO global_format_settings (format_key, is_active)
VALUES ('lyrics_auto_scroll', true)
ON CONFLICT (format_key) DO NOTHING;