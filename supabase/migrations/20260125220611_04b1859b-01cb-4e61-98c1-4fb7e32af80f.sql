-- Add missing columns to free_mode_settings for full parity with event_booking_rules

-- Booking window
ALTER TABLE public.free_mode_settings 
ADD COLUMN IF NOT EXISTS booking_opens_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS booking_closes_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS close_minutes_before_end integer DEFAULT NULL;

-- Final limit (urgency mode)
ALTER TABLE public.free_mode_settings 
ADD COLUMN IF NOT EXISTS openmic_final_limit_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS openmic_final_limit_songs integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS openmic_final_limit_minutes integer DEFAULT NULL;

-- Reopening functionality
ALTER TABLE public.free_mode_settings 
ADD COLUMN IF NOT EXISTS reopen_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reopen_until timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reopen_extra_songs integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reopen_extra_dediche integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reopen_songs_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS reopen_dediche_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS reopen_message text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reopen_mode text DEFAULT NULL;

-- Closure configuration
ALTER TABLE public.free_mode_settings 
ADD COLUMN IF NOT EXISTS closure_mode text DEFAULT 'overlay',
ADD COLUMN IF NOT EXISTS closure_title text DEFAULT 'Prenotazioni chiuse',
ADD COLUMN IF NOT EXISTS closure_message text DEFAULT 'Grazie per aver partecipato! Seguici per i prossimi eventi.',
ADD COLUMN IF NOT EXISTS closure_redirect_url text DEFAULT NULL;