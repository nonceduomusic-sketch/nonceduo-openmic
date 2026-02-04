-- Add catalog preview settings to free_mode_settings
ALTER TABLE public.free_mode_settings 
ADD COLUMN IF NOT EXISTS catalog_preview_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS catalog_preview_limit_type text DEFAULT 'percent',
ADD COLUMN IF NOT EXISTS catalog_preview_limit_value integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS catalog_preview_message text DEFAULT 'e molto altro... vienilo a scoprire partecipando ai nostri eventi!';

-- Add global toggle for showing catalog preview (also when no event is active)
INSERT INTO public.global_format_settings (format_key, is_active, updated_at)
VALUES ('catalog_preview', false, now())
ON CONFLICT (format_key) DO NOTHING;

-- Update same fields in event_booking_rules for scheduled events too
ALTER TABLE public.event_booking_rules 
ADD COLUMN IF NOT EXISTS catalog_preview_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS catalog_preview_limit_type text DEFAULT 'percent',
ADD COLUMN IF NOT EXISTS catalog_preview_limit_value integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS catalog_preview_message text DEFAULT 'e molto altro... vienilo a scoprire partecipando ai nostri eventi!';