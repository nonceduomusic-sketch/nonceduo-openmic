-- Update validate_pin_session to support global session validation across formats
-- The session is valid if:
-- 1. The token exists and is_valid = true
-- 2. The live session is still active and not expired
-- 3. The format is protected by this live session (for security)

CREATE OR REPLACE FUNCTION public.validate_pin_session(p_token text, p_format text)
RETURNS TABLE(is_valid boolean, live_session_id uuid, pin_code text, protected_formats text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    -- Session is valid if token is valid AND live session is active
    (ps.is_valid = true AND ls.is_active = true AND (ls.expires_at IS NULL OR ls.expires_at > now())) AS is_valid,
    ls.id AS live_session_id,
    ls.pin_code,
    ls.protected_formats
  FROM public.pin_sessions ps
  JOIN public.live_sessions ls ON ls.id = ps.live_session_id
  WHERE ps.session_token = p_token
    AND ps.is_valid = true
    AND ls.is_active = true
    -- Format must be protected by this live session for access to be granted
    AND (p_format = ANY(ls.protected_formats) OR ls.protected_formats IS NULL)
  LIMIT 1;
END;
$function$;

-- Update last_validated_at when session is validated
CREATE OR REPLACE FUNCTION public.touch_pin_session(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.pin_sessions
  SET last_validated_at = now()
  WHERE session_token = p_token AND is_valid = true;
END;
$function$;