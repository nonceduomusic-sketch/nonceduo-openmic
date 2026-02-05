-- Create RPC function for remote users to update highlight_line
-- This allows PIN-authenticated remote users to scroll lyrics without full RLS access

CREATE OR REPLACE FUNCTION public.remote_update_highlight_line(
  p_session_id UUID,  -- The remote session ID (from broadcast_remote_sessions)
  p_sala_code TEXT,
  p_highlight_line INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_valid BOOLEAN := false;
BEGIN
  -- Verify the remote session is active and valid
  SELECT EXISTS (
    SELECT 1 
    FROM broadcast_remote_sessions brs
    JOIN broadcast_remote_access bra ON brs.access_id = bra.id
    WHERE brs.id = p_session_id
      AND brs.is_active = true
      AND bra.is_active = true
      AND bra.sala_code = p_sala_code
      AND (bra.expires_at IS NULL OR bra.expires_at > now())
  ) INTO v_is_valid;
  
  IF NOT v_is_valid THEN
    RETURN false;
  END IF;
  
  -- Update the broadcast session highlight_line
  UPDATE broadcast_sessions
  SET 
    highlight_line = p_highlight_line,
    updated_at = now()
  WHERE sala_code = p_sala_code;
  
  -- Update last activity on the remote session
  UPDATE broadcast_remote_sessions
  SET last_activity_at = now()
  WHERE id = p_session_id;
  
  RETURN true;
END;
$$;

-- Grant execute to anon users (they authenticate via the session ID check)
GRANT EXECUTE ON FUNCTION public.remote_update_highlight_line(uuid, text, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.remote_update_highlight_line(uuid, text, integer) TO authenticated;