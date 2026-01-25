-- ============================================
-- FASE 1: Gestione Avanzata Prenotazioni Evento
-- ============================================

-- Tabella principale per le regole di prenotazione evento
CREATE TABLE public.event_booking_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Orario Evento (informativo)
  event_name TEXT DEFAULT 'Serata Live',
  event_date DATE,
  event_start_time TIME,
  event_end_time TIME,
  
  -- Finestra Prenotazione (operativa)
  booking_opens_at TIMESTAMPTZ,
  booking_closes_at TIMESTAMPTZ,
  close_minutes_before_end INTEGER, -- alternativa: chiudi X min prima della fine
  
  -- Limiti Open Mic
  openmic_enabled BOOLEAN DEFAULT true,
  openmic_max_songs INTEGER,  -- NULL = illimitato
  openmic_final_limit_enabled BOOLEAN DEFAULT false,
  openmic_final_limit_songs INTEGER, -- max negli ultimi X min
  openmic_final_limit_minutes INTEGER, -- ultimi X minuti
  
  -- Limiti Dediche
  dediche_enabled BOOLEAN DEFAULT true,
  dediche_max_total INTEGER, -- NULL = illimitato
  
  -- Contatori live (aggiornati atomicamente)
  openmic_current_count INTEGER DEFAULT 0,
  dediche_current_count INTEGER DEFAULT 0,
  
  -- Riapertura Straordinaria
  reopen_active BOOLEAN DEFAULT false,
  reopen_until TIMESTAMPTZ,
  reopen_mode TEXT, -- 'time' | 'songs' | 'dediche'
  reopen_extra_songs INTEGER,
  reopen_extra_dediche INTEGER,
  reopen_songs_used INTEGER DEFAULT 0,
  reopen_dediche_used INTEGER DEFAULT 0,
  reopen_message TEXT,
  
  -- Chiusura UX
  closure_mode TEXT DEFAULT 'overlay', -- 'overlay' | 'redirect'
  closure_title TEXT DEFAULT 'Prenotazioni chiuse',
  closure_message TEXT DEFAULT 'Grazie per aver partecipato! Seguici per i prossimi eventi.',
  closure_redirect_url TEXT,
  
  -- Stato e Metadata
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indici per performance
CREATE INDEX idx_event_booking_rules_active ON public.event_booking_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_event_booking_rules_date ON public.event_booking_rules(event_date);

-- Enable RLS
ALTER TABLE public.event_booking_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Chiunque può leggere le regole attive (per mostrare limiti/countdown agli utenti)
CREATE POLICY "Anyone can view active event rules"
ON public.event_booking_rules
FOR SELECT
USING (is_active = true);

-- Policy: Staff può vedere tutte le regole
CREATE POLICY "Staff can view all event rules"
ON public.event_booking_rules
FOR SELECT
USING (
  is_owner(auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);

-- Policy: Solo Owner e Admin possono gestire le regole
CREATE POLICY "Owners and Admins can manage event rules"
ON public.event_booking_rules
FOR ALL
USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger per updated_at
CREATE TRIGGER update_event_booking_rules_updated_at
  BEFORE UPDATE ON public.event_booking_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime per aggiornamenti istantanei
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_booking_rules;

-- Inserisci regola di default (inattiva)
INSERT INTO public.event_booking_rules (
  event_name,
  is_active,
  openmic_enabled,
  dediche_enabled,
  closure_mode,
  closure_title,
  closure_message
) VALUES (
  'Serata Karaoke',
  false,
  true,
  true,
  'overlay',
  'Prenotazioni chiuse! 🎤',
  'Grazie per aver partecipato alla serata! Seguici sui social per non perdere i prossimi eventi.'
);