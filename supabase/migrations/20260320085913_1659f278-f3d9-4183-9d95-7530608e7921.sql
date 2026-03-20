
-- RPC to list active PIN sessions for admin
CREATE OR REPLACE FUNCTION public.list_active_pin_sessions(p_live_session_id uuid)
RETURNS TABLE(
  id uuid,
  format text,
  device_fingerprint text,
  created_at timestamptz,
  last_validated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.format,
    ps.device_fingerprint,
    ps.created_at,
    ps.last_validated_at
  FROM public.pin_sessions ps
  WHERE ps.live_session_id = p_live_session_id
    AND ps.is_valid = true
  ORDER BY ps.created_at DESC;
END;
$$;

-- RPC to invalidate a single PIN session
CREATE OR REPLACE FUNCTION public.invalidate_single_pin_session(p_session_id uuid, p_reason text DEFAULT 'admin_kick')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.pin_sessions
  SET 
    is_valid = false,
    invalidated_at = now(),
    invalidation_reason = p_reason
  WHERE id = p_session_id
    AND is_valid = true;
  
  RETURN FOUND;
END;
$$;
