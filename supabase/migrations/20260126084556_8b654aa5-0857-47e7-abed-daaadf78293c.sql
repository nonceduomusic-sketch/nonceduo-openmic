-- Add "final limit" columns for dediche (same as openmic)
ALTER TABLE public.event_booking_rules
ADD COLUMN IF NOT EXISTS dediche_final_limit_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS dediche_final_limit_total integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS dediche_final_limit_minutes integer DEFAULT NULL;

ALTER TABLE public.free_mode_settings
ADD COLUMN IF NOT EXISTS dediche_final_limit_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS dediche_final_limit_total integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS dediche_final_limit_minutes integer DEFAULT NULL;

-- Add event timing fields to free_mode_settings (for auto-start/end)
ALTER TABLE public.free_mode_settings
ADD COLUMN IF NOT EXISTS event_date date DEFAULT NULL,
ADD COLUMN IF NOT EXISTS event_start_time time without time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS event_end_time time without time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS start_mode text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS end_mode text DEFAULT 'manual';

-- start_mode: 'manual' | 'scheduled' (partenza manuale vs automatica a data/ora)
-- end_mode: 'manual' | 'scheduled' | 'duration' (termine manuale vs data/ora vs X minuti dalla partenza)