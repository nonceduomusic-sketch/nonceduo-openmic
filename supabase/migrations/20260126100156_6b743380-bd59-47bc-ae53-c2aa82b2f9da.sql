-- Aggiungi colonna per limite canzoni consecutive
ALTER TABLE public.free_mode_settings
ADD COLUMN IF NOT EXISTS user_limit_consecutive_songs integer DEFAULT NULL;

-- Aggiungi stessa colonna a event_booking_rules per consistenza
ALTER TABLE public.event_booking_rules
ADD COLUMN IF NOT EXISTS user_limit_consecutive_songs integer DEFAULT NULL;

-- Aggiungi colonna per tracciare prenotazioni consecutive nella tabella user_booking_counts
ALTER TABLE public.user_booking_counts
ADD COLUMN IF NOT EXISTS consecutive_songs integer DEFAULT 0;

-- Aggiungi colonna per l'ultima prenotazione della persona (per calcolare consecutive)
ALTER TABLE public.user_booking_counts
ADD COLUMN IF NOT EXISTS last_reservation_id uuid DEFAULT NULL;

-- Commento per chiarezza
COMMENT ON COLUMN public.free_mode_settings.user_limit_consecutive_songs IS 'Max canzoni consecutive senza prenotazioni di altri nel mezzo. NULL = nessun limite';
COMMENT ON COLUMN public.user_booking_counts.consecutive_songs IS 'Numero di prenotazioni consecutive attuali (resettato quando qualcun altro prenota)';
COMMENT ON COLUMN public.user_booking_counts.last_reservation_id IS 'ID ultima prenotazione per tracciare consecutività';