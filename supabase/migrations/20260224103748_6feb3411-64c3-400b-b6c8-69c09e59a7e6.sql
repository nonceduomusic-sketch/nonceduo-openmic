
-- Add event_end_date to free_mode_settings and event_booking_rules
ALTER TABLE public.free_mode_settings ADD COLUMN IF NOT EXISTS event_end_date text;
ALTER TABLE public.event_booking_rules ADD COLUMN IF NOT EXISTS event_end_date text;

-- Add TV game mode to game_settings
ALTER TABLE public.game_settings 
ADD COLUMN IF NOT EXISTS tv_display_mode text NOT NULL DEFAULT 'off';
-- tv_display_mode: 'off' | 'banner' | 'fullscreen'
