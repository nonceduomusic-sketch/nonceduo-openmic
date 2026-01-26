-- Aggiungi colonne per configurazione countdown avvisi (minuti prima di mostrare il countdown)
ALTER TABLE public.free_mode_settings
ADD COLUMN IF NOT EXISTS countdown_start_show_minutes integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS countdown_end_show_minutes integer DEFAULT 10;

-- Commenti descrittivi
COMMENT ON COLUMN public.free_mode_settings.countdown_start_show_minutes IS 'Minuti prima della partenza per mostrare il countdown (null = sempre visibile)';
COMMENT ON COLUMN public.free_mode_settings.countdown_end_show_minutes IS 'Minuti prima della fine per mostrare il countdown (null = sempre visibile)';

-- Stessa cosa per event_booking_rules
ALTER TABLE public.event_booking_rules
ADD COLUMN IF NOT EXISTS countdown_start_show_minutes integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS countdown_end_show_minutes integer DEFAULT 10;

COMMENT ON COLUMN public.event_booking_rules.countdown_start_show_minutes IS 'Minuti prima della partenza per mostrare il countdown (null = sempre visibile)';
COMMENT ON COLUMN public.event_booking_rules.countdown_end_show_minutes IS 'Minuti prima della fine per mostrare il countdown (null = sempre visibile)';