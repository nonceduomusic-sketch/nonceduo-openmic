-- Create table for persistent PIN sessions
CREATE TABLE public.pin_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token TEXT NOT NULL UNIQUE,
  live_session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  pin_code_hash TEXT NOT NULL, -- Hash of PIN used to create session
  format TEXT NOT NULL CHECK (format IN ('openmic', 'dediche')),
  device_fingerprint TEXT, -- Optional device identifier
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_validated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_valid BOOLEAN NOT NULL DEFAULT true,
  invalidated_at TIMESTAMP WITH TIME ZONE,
  invalidation_reason TEXT
);

-- Create index for fast lookups
CREATE INDEX idx_pin_sessions_token ON public.pin_sessions(session_token) WHERE is_valid = true;
CREATE INDEX idx_pin_sessions_live_session ON public.pin_sessions(live_session_id) WHERE is_valid = true;

-- Enable RLS
ALTER TABLE public.pin_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can create PIN sessions (after validation happens in code)
CREATE POLICY "Anyone can create PIN sessions"
ON public.pin_sessions
FOR INSERT
WITH CHECK (true);

-- Policy: Anyone can read their own session (by token)
CREATE POLICY "Anyone can validate own session"
ON public.pin_sessions
FOR SELECT
USING (true);

-- Policy: Only owners/admins can manage sessions
CREATE POLICY "Staff can manage PIN sessions"
ON public.pin_sessions
FOR ALL
USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Function to invalidate all sessions for a live session (called on PIN change)
CREATE OR REPLACE FUNCTION public.invalidate_pin_sessions(
  p_live_session_id UUID,
  p_reason TEXT DEFAULT 'pin_changed'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.pin_sessions
  SET 
    is_valid = false,
    invalidated_at = now(),
    invalidation_reason = p_reason
  WHERE live_session_id = p_live_session_id
    AND is_valid = true;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Function to validate a session token
CREATE OR REPLACE FUNCTION public.validate_pin_session(
  p_token TEXT,
  p_format TEXT
)
RETURNS TABLE(
  is_valid BOOLEAN,
  live_session_id UUID,
  pin_code TEXT,
  protected_formats TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.is_valid AND ls.is_active AND (ls.expires_at IS NULL OR ls.expires_at > now()) AS is_valid,
    ls.id AS live_session_id,
    ls.pin_code,
    ls.protected_formats
  FROM public.pin_sessions ps
  JOIN public.live_sessions ls ON ls.id = ps.live_session_id
  WHERE ps.session_token = p_token
    AND ps.format = p_format
    AND ps.is_valid = true
  LIMIT 1;
END;
$$;

-- Function to create a new session token
CREATE OR REPLACE FUNCTION public.create_pin_session(
  p_live_session_id UUID,
  p_format TEXT,
  p_pin_code TEXT,
  p_device_fingerprint TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_pin_hash TEXT;
BEGIN
  -- Generate unique token
  v_token := encode(gen_random_bytes(32), 'hex');
  v_pin_hash := encode(sha256(p_pin_code::bytea), 'hex');
  
  -- Insert session
  INSERT INTO public.pin_sessions (
    session_token,
    live_session_id,
    pin_code_hash,
    format,
    device_fingerprint
  ) VALUES (
    v_token,
    p_live_session_id,
    v_pin_hash,
    p_format,
    p_device_fingerprint
  );
  
  RETURN v_token;
END;
$$;

-- Add trigger to invalidate sessions when PIN changes
CREATE OR REPLACE FUNCTION public.on_live_session_pin_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If PIN code changed, invalidate all sessions
  IF OLD.pin_code IS DISTINCT FROM NEW.pin_code THEN
    PERFORM invalidate_pin_sessions(NEW.id, 'pin_changed');
  END IF;
  
  -- If session deactivated, invalidate all sessions
  IF OLD.is_active = true AND NEW.is_active = false THEN
    PERFORM invalidate_pin_sessions(NEW.id, 'session_deactivated');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_live_session_pin_change
AFTER UPDATE ON public.live_sessions
FOR EACH ROW
EXECUTE FUNCTION public.on_live_session_pin_change();

-- Enable realtime for pin_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.pin_sessions;