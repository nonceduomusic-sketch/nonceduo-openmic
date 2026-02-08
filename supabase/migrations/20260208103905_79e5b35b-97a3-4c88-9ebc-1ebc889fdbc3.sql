-- Update the remote_update_highlight_line function to respect remote_scroll_enabled flag
CREATE OR REPLACE FUNCTION public.remote_update_highlight_line(p_session_id uuid, p_sala_code text, p_highlight_line integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_valid BOOLEAN := false;
  v_remote_scroll_enabled BOOLEAN := false;
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
  
  -- Check if remote scroll is enabled for this sala
  SELECT COALESCE(remote_scroll_enabled, true) INTO v_remote_scroll_enabled
  FROM broadcast_sessions
  WHERE sala_code = p_sala_code;
  
  IF NOT v_remote_scroll_enabled THEN
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
$function$;