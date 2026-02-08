-- Remote scroll mirroring: update scroll_position (0-1000) from validated remote sessions

CREATE OR REPLACE FUNCTION public.remote_update_scroll_position(
  p_session_id uuid,
  p_sala_code text,
  p_scroll_position integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_valid BOOLEAN := false;
  v_remote_scroll_enabled BOOLEAN := false;
  v_pos INTEGER := 0;
BEGIN
  -- Clamp 0..1000
  v_pos := GREATEST(0, LEAST(1000, COALESCE(p_scroll_position, 0)));

  -- Verify the remote session is active and valid for this sala
  SELECT EXISTS (
    SELECT 1
    FROM public.broadcast_remote_sessions brs
    JOIN public.broadcast_remote_access bra ON brs.access_id = bra.id
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
  SELECT COALESCE(remote_scroll_enabled, true)
    INTO v_remote_scroll_enabled
  FROM public.broadcast_sessions
  WHERE sala_code = p_sala_code;

  IF NOT v_remote_scroll_enabled THEN
    RETURN false;
  END IF;

  -- Update scroll position
  UPDATE public.broadcast_sessions
  SET
    scroll_position = v_pos,
    updated_at = now()
  WHERE sala_code = p_sala_code;

  -- Touch session activity
  UPDATE public.broadcast_remote_sessions
  SET last_activity_at = now()
  WHERE id = p_session_id;

  RETURN true;
END;
$function$;

-- Make sure clients can call it
GRANT EXECUTE ON FUNCTION public.remote_update_scroll_position(uuid, text, integer) TO anon, authenticated;