-- ============================================
-- FASE 1: Tabella QR Code multipli per evento
-- ============================================

-- Tabella per gestire QR code multipli, ognuno con PIN univoco
-- Ogni QR è associato a un evento (free_mode o event_booking_rules)
CREATE TABLE public.event_qr_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Nome identificativo del QR (es. "Venerdì 7 Marzo – Locale Centrale")
  name TEXT NOT NULL,
  
  -- PIN univoco 4-8 caratteri (generato o personalizzato)
  pin_code TEXT NOT NULL,
  
  -- Collegamento flessibile all'evento:
  -- - Per eventi programmati: event_id = UUID dell'evento in event_booking_rules
  -- - Per evento libero: event_id = 'free-mode' (valore speciale fisso)
  event_id TEXT NOT NULL,
  
  -- Tipo evento per facilitare le query
  event_type TEXT NOT NULL DEFAULT 'scheduled' CHECK (event_type IN ('freemode', 'scheduled')),
  
  -- Stato del QR
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Contatore utilizzi (per analytics)
  use_count INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamp ultima scansione
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indici per performance
CREATE INDEX idx_event_qr_codes_event_id ON public.event_qr_codes(event_id);
CREATE INDEX idx_event_qr_codes_pin_code ON public.event_qr_codes(pin_code);
CREATE INDEX idx_event_qr_codes_active ON public.event_qr_codes(is_active) WHERE is_active = true;

-- Constraint per PIN univoco (case-insensitive)
CREATE UNIQUE INDEX idx_event_qr_codes_pin_unique ON public.event_qr_codes(UPPER(TRIM(pin_code)));

-- RLS
ALTER TABLE public.event_qr_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Staff può gestire QR codes
CREATE POLICY "Staff can manage QR codes"
ON public.event_qr_codes
FOR ALL
USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Policy: Chiunque può leggere i QR attivi (per validazione PIN)
CREATE POLICY "Anyone can validate active QR codes"
ON public.event_qr_codes
FOR SELECT
USING (is_active = true);

-- Trigger per updated_at
CREATE TRIGGER update_event_qr_codes_updated_at
BEFORE UPDATE ON public.event_qr_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Aggiunta campi per Modalità Consultabile
-- ============================================

-- Flag per modalità consultabile (solo lettura, no prenotazioni)
ALTER TABLE public.event_booking_rules 
ADD COLUMN IF NOT EXISTS is_consultable_mode BOOLEAN DEFAULT false;

-- Flag per proteggere il repertorio (nasconde testi)
ALTER TABLE public.event_booking_rules 
ADD COLUMN IF NOT EXISTS protect_repertoire BOOLEAN DEFAULT false;

-- Stessi campi per free_mode_settings
ALTER TABLE public.free_mode_settings 
ADD COLUMN IF NOT EXISTS is_consultable_mode BOOLEAN DEFAULT false;

ALTER TABLE public.free_mode_settings 
ADD COLUMN IF NOT EXISTS protect_repertoire BOOLEAN DEFAULT false;

-- ============================================
-- Funzione RPC per validare QR+PIN
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_event_qr_pin(
  p_pin TEXT,
  p_format TEXT DEFAULT NULL
)
RETURNS TABLE(
  is_valid BOOLEAN,
  event_id TEXT,
  event_type TEXT,
  qr_name TEXT,
  event_name TEXT,
  is_live BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_qr RECORD;
  v_is_live BOOLEAN := false;
  v_event_name TEXT := null;
BEGIN
  -- Trova il QR code con questo PIN
  SELECT * INTO v_qr
  FROM public.event_qr_codes
  WHERE UPPER(TRIM(pin_code)) = UPPER(TRIM(p_pin))
    AND is_active = true
  LIMIT 1;

  -- Se non trovato, ritorna non valido
  IF v_qr IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, false;
    RETURN;
  END IF;

  -- Aggiorna contatore utilizzi
  UPDATE public.event_qr_codes
  SET use_count = use_count + 1,
      last_used_at = now()
  WHERE id = v_qr.id;

  -- Verifica se l'evento associato è LIVE
  IF v_qr.event_type = 'freemode' THEN
    -- Controlla free_mode_settings
    SELECT is_active, event_name INTO v_is_live, v_event_name
    FROM public.free_mode_settings
    WHERE is_active = true
    LIMIT 1;
  ELSE
    -- Controlla event_booking_rules
    SELECT (event_status = 'live'), event_name INTO v_is_live, v_event_name
    FROM public.event_booking_rules
    WHERE id::text = v_qr.event_id
      AND event_status = 'live'
    LIMIT 1;
  END IF;

  RETURN QUERY SELECT 
    true,
    v_qr.event_id,
    v_qr.event_type,
    v_qr.name,
    COALESCE(v_event_name, 'Evento'),
    COALESCE(v_is_live, false);
END;
$$;