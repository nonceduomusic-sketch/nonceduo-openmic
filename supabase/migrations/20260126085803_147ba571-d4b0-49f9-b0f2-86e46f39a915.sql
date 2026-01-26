-- =====================================================
-- FASE 2: Limiti per Utente (Per-User Booking Limits)
-- =====================================================

-- 1. Aggiungere colonne per configurazione limiti utente a free_mode_settings
ALTER TABLE public.free_mode_settings
ADD COLUMN IF NOT EXISTS user_limit_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS user_limit_mode text DEFAULT 'session', -- 'session' | 'session_name'
ADD COLUMN IF NOT EXISTS user_limit_songs_total integer DEFAULT NULL, -- limite totale canzoni per utente
ADD COLUMN IF NOT EXISTS user_limit_dediche_total integer DEFAULT NULL, -- limite totale dediche per utente
ADD COLUMN IF NOT EXISTS user_limit_songs_interval integer DEFAULT NULL, -- limite canzoni per intervallo
ADD COLUMN IF NOT EXISTS user_limit_interval_minutes integer DEFAULT NULL, -- durata intervallo in minuti
ADD COLUMN IF NOT EXISTS user_limit_cooldown_message text DEFAULT 'Hai superato il limite di prenotazioni. Potrai riprendere tra {minutes} minuti.';

-- 2. Aggiungere le stesse colonne a event_booking_rules
ALTER TABLE public.event_booking_rules
ADD COLUMN IF NOT EXISTS user_limit_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS user_limit_mode text DEFAULT 'session',
ADD COLUMN IF NOT EXISTS user_limit_songs_total integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS user_limit_dediche_total integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS user_limit_songs_interval integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS user_limit_interval_minutes integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS user_limit_cooldown_message text DEFAULT 'Hai superato il limite di prenotazioni. Potrai riprendere tra {minutes} minuti.';

-- 3. Creare tabella per tracciare le prenotazioni per utente (per event)
CREATE TABLE IF NOT EXISTS public.user_booking_counts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL, -- ID evento (da free_mode_settings o event_booking_rules)
  session_fingerprint text NOT NULL,
  customer_name text,
  songs_count integer NOT NULL DEFAULT 0,
  dediche_count integer NOT NULL DEFAULT 0,
  last_booking_at timestamp with time zone DEFAULT now(),
  first_booking_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(event_id, session_fingerprint, customer_name)
);

-- 4. Creare indici per query performanti
CREATE INDEX IF NOT EXISTS idx_user_booking_counts_event_session 
  ON public.user_booking_counts(event_id, session_fingerprint);

CREATE INDEX IF NOT EXISTS idx_user_booking_counts_last_booking 
  ON public.user_booking_counts(last_booking_at);

-- 5. Enable RLS
ALTER TABLE public.user_booking_counts ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
CREATE POLICY "Anyone can view own booking counts" 
  ON public.user_booking_counts 
  FOR SELECT 
  USING (true);

CREATE POLICY "System can insert booking counts" 
  ON public.user_booking_counts 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "System can update booking counts" 
  ON public.user_booking_counts 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Staff can manage booking counts" 
  ON public.user_booking_counts 
  FOR ALL 
  USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- 7. Enable realtime per sincronizzazione
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_booking_counts;

-- 8. Trigger per aggiornare updated_at
CREATE TRIGGER update_user_booking_counts_updated_at
  BEFORE UPDATE ON public.user_booking_counts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();