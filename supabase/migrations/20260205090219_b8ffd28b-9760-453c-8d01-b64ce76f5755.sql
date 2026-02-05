-- Fix validate_remote_access function to work for anonymous users
-- The function needs SECURITY DEFINER to bypass RLS and update last_used_at

-- Drop existing function first
DROP FUNCTION IF EXISTS public.validate_remote_access(text, text);

-- Recreate with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.validate_remote_access(
  p_token TEXT,
  p_pin TEXT
)
RETURNS TABLE(is_valid BOOLEAN, access_id UUID, sala_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true AS is_valid,
    bra.id AS access_id,
    bra.sala_code AS sala_code
  FROM broadcast_remote_access bra
  WHERE bra.access_token = p_token
    AND bra.pin_code = p_pin
    AND bra.is_active = true
    AND (bra.expires_at IS NULL OR bra.expires_at > now());

  -- Update last_used_at (now works because SECURITY DEFINER)
  UPDATE public.broadcast_remote_access
  SET last_used_at = now()
  WHERE access_token = p_token AND pin_code = p_pin;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.validate_remote_access(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_remote_access(text, text) TO anon;

-- Also fix kick_all_remote_sessions to use SECURITY DEFINER
DROP FUNCTION IF EXISTS public.kick_all_remote_sessions(uuid);

CREATE OR REPLACE FUNCTION public.kick_all_remote_sessions(p_access_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  kicked_count INTEGER;
BEGIN
  UPDATE public.broadcast_remote_sessions
  SET is_active = false
  WHERE access_id = p_access_id AND is_active = true;
  
  GET DIAGNOSTICS kicked_count = ROW_COUNT;
  RETURN kicked_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.kick_all_remote_sessions(uuid) TO authenticated;

-- Add proper RLS policies for broadcast_remote_access (read only for anon users with valid token)
DROP POLICY IF EXISTS "Anyone can read remote access by token" ON public.broadcast_remote_access;
CREATE POLICY "Anyone can read remote access by token"
  ON public.broadcast_remote_access
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Add RLS policy for broadcast_remote_sessions (allow insert for anon users)
DROP POLICY IF EXISTS "Anon users can create sessions" ON public.broadcast_remote_sessions;
CREATE POLICY "Anon users can create sessions"
  ON public.broadcast_remote_sessions
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon users can read own sessions" ON public.broadcast_remote_sessions;
CREATE POLICY "Anon users can read own sessions"
  ON public.broadcast_remote_sessions
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Anon users can update own sessions" ON public.broadcast_remote_sessions;
CREATE POLICY "Anon users can update own sessions"
  ON public.broadcast_remote_sessions
  FOR UPDATE
  TO anon
  USING (true);