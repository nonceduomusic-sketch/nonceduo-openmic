-- Update the validate_live_session_pin function to search by protected_formats
-- instead of section, since section is now 'event' or 'freemode'
CREATE OR REPLACE FUNCTION public.validate_live_session_pin(p_section text, p_pin text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session_id TEXT;
  v_attempt_count INT;
  v_is_valid BOOLEAN;
BEGIN
  -- Get session ID from request headers (if available)
  v_session_id := COALESCE(
    current_setting('request.headers', true)::json->>'x-session-id',
    'anonymous'
  );
  
  -- Check rate limit: max 10 attempts per hour
  SELECT COUNT(*) INTO v_attempt_count
  FROM public.security_rate_limits
  WHERE identifier = v_session_id
    AND action_type = 'pin_validation'
    AND attempted_at > now() - interval '1 hour'
    AND success = false;
    
  IF v_attempt_count >= 10 THEN
    -- Log the blocked attempt
    INSERT INTO public.security_rate_limits (identifier, action_type, success)
    VALUES (v_session_id, 'pin_validation_blocked', false);
    
    RAISE EXCEPTION 'Troppi tentativi. Riprova tra 1 ora.';
  END IF;
  
  -- Perform validation: check if PIN matches any active live_session
  -- that has p_section in its protected_formats array
  v_is_valid := EXISTS (
    SELECT 1 FROM public.live_sessions
    WHERE pin_code = UPPER(TRIM(p_pin))
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND (
        -- Either the format is in protected_formats
        p_section = ANY(protected_formats)
        -- Or we're matching any active session with this PIN (for shared access)
        OR protected_formats IS NULL
      )
  );
  
  -- Log the attempt
  INSERT INTO public.security_rate_limits (identifier, action_type, success)
  VALUES (v_session_id, 'pin_validation', v_is_valid);
  
  RETURN v_is_valid;
END;
$function$;