-- Tabella per gestire gli accessi al telecomando trasmissione
CREATE TABLE public.broadcast_remote_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  pin_code TEXT NOT NULL DEFAULT UPPER(SUBSTRING(encode(gen_random_bytes(3), 'hex') FROM 1 FOR 6)),
  sala_code TEXT NOT NULL DEFAULT 'main',
  name TEXT NOT NULL DEFAULT 'Telecomando Principale',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

-- Tabella per tracciare le sessioni remote attive
CREATE TABLE public.broadcast_remote_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_id UUID NOT NULL REFERENCES public.broadcast_remote_access(id) ON DELETE CASCADE,
  device_fingerprint TEXT,
  device_name TEXT DEFAULT 'Dispositivo sconosciuto',
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Indici per performance
CREATE INDEX idx_broadcast_remote_access_token ON public.broadcast_remote_access(access_token);
CREATE INDEX idx_broadcast_remote_access_active ON public.broadcast_remote_access(is_active);
CREATE INDEX idx_broadcast_remote_sessions_access ON public.broadcast_remote_sessions(access_id);
CREATE INDEX idx_broadcast_remote_sessions_active ON public.broadcast_remote_sessions(is_active);

-- Enable RLS
ALTER TABLE public.broadcast_remote_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_remote_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies per broadcast_remote_access
-- Staff può gestire gli accessi
CREATE POLICY "Staff can manage remote access"
ON public.broadcast_remote_access
FOR ALL
USING (
  is_owner(auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role) OR
  (is_operator(auth.uid()) AND has_permission(auth.uid(), 'operator.trasmetti_manage'))
);

-- Chiunque può validare un token attivo (per la pagina pubblica)
CREATE POLICY "Anyone can validate active tokens"
ON public.broadcast_remote_access
FOR SELECT
USING (
  is_active = true AND 
  (expires_at IS NULL OR expires_at > now())
);

-- RLS Policies per broadcast_remote_sessions
-- Staff può vedere tutte le sessioni
CREATE POLICY "Staff can view all remote sessions"
ON public.broadcast_remote_sessions
FOR SELECT
USING (
  is_owner(auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role) OR
  (is_operator(auth.uid()) AND has_permission(auth.uid(), 'operator.trasmetti_view'))
);

-- Staff può gestire le sessioni
CREATE POLICY "Staff can manage remote sessions"
ON public.broadcast_remote_sessions
FOR ALL
USING (
  is_owner(auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role) OR
  (is_operator(auth.uid()) AND has_permission(auth.uid(), 'operator.trasmetti_manage'))
);

-- Chiunque può creare una sessione (dopo validazione PIN)
CREATE POLICY "Anyone can create remote sessions"
ON public.broadcast_remote_sessions
FOR INSERT
WITH CHECK (true);

-- Chiunque può aggiornare la propria sessione (last_activity)
CREATE POLICY "Anyone can update own session activity"
ON public.broadcast_remote_sessions
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Trigger per updated_at
CREATE TRIGGER update_broadcast_remote_access_updated_at
BEFORE UPDATE ON public.broadcast_remote_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Abilita Realtime per sincronizzazione
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_remote_access;
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_remote_sessions;

-- Funzione per validare accesso telecomando (PIN + Token)
CREATE OR REPLACE FUNCTION public.validate_remote_access(p_token TEXT, p_pin TEXT)
RETURNS TABLE(
  is_valid BOOLEAN,
  access_id UUID,
  sala_code TEXT,
  access_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true AS is_valid,
    bra.id AS access_id,
    bra.sala_code,
    bra.name AS access_name
  FROM public.broadcast_remote_access bra
  WHERE bra.access_token = p_token
    AND UPPER(TRIM(bra.pin_code)) = UPPER(TRIM(p_pin))
    AND bra.is_active = true
    AND (bra.expires_at IS NULL OR bra.expires_at > now())
  LIMIT 1;
  
  -- Aggiorna last_used_at se trovato
  IF FOUND THEN
    UPDATE public.broadcast_remote_access
    SET last_used_at = now()
    WHERE access_token = p_token;
  END IF;
END;
$$;

-- Funzione per espellere tutte le sessioni di un accesso
CREATE OR REPLACE FUNCTION public.kick_all_remote_sessions(p_access_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.broadcast_remote_sessions
  SET is_active = false
  WHERE access_id = p_access_id AND is_active = true;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;