-- Fix create_pin_session function to properly qualify extension functions
-- The issue is that gen_random_bytes and sha256 are in the extensions schema,
-- but the function has SET search_path TO 'public' which doesn't include extensions

CREATE OR REPLACE FUNCTION public.create_pin_session(
  p_live_session_id uuid, 
  p_format text, 
  p_pin_code text, 
  p_device_fingerprint text DEFAULT NULL::text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token TEXT;
  v_pin_hash TEXT;
BEGIN
  -- Generate unique token using fully qualified function name
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_pin_hash := encode(extensions.digest(p_pin_code::bytea, 'sha256'), 'hex');
  
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
$function$;