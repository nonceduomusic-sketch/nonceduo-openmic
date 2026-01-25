-- Add closure_preview_enabled flag to free_mode_settings
ALTER TABLE public.free_mode_settings 
ADD COLUMN IF NOT EXISTS closure_preview_enabled boolean DEFAULT false;

-- Add closure_preview_enabled flag to event_booking_rules for parity
ALTER TABLE public.event_booking_rules 
ADD COLUMN IF NOT EXISTS closure_preview_enabled boolean DEFAULT false;

COMMENT ON COLUMN public.free_mode_settings.closure_preview_enabled IS 'When true, shows closure overlay to users for testing/preview purposes';
COMMENT ON COLUMN public.event_booking_rules.closure_preview_enabled IS 'When true, shows closure overlay to users for testing/preview purposes';