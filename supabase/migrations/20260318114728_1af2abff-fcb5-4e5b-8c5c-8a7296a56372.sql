
-- ============================================================
-- FIX 1: Remove public UPDATE on broadcast_sessions
-- ============================================================
DROP POLICY IF EXISTS "Anyone can update broadcast sessions" ON public.broadcast_sessions;

-- ============================================================
-- FIX 2: Remove public SELECT on broadcast_remote_access
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read remote access by token" ON public.broadcast_remote_access;
DROP POLICY IF EXISTS "Anyone can validate active tokens" ON public.broadcast_remote_access;

-- ============================================================
-- FIX 3: Remove public SELECT on furore_remote_access
-- ============================================================
DROP POLICY IF EXISTS "Anyone can validate active furore remote tokens" ON public.furore_remote_access;

-- ============================================================
-- RPC: check_remote_token — returns basic info without exposing token/PIN
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_remote_token(p_token text)
RETURNS TABLE(access_id uuid, sala_code text, name text, pin_required boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update last_used_at
  UPDATE public.broadcast_remote_access
  SET last_used_at = now()
  WHERE access_token = p_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

  RETURN QUERY
  SELECT 
    bra.id AS access_id,
    bra.sala_code,
    bra.name,
    bra.pin_required
  FROM public.broadcast_remote_access bra
  WHERE bra.access_token = p_token
    AND bra.is_active = true
    AND (bra.expires_at IS NULL OR bra.expires_at > now())
  LIMIT 1;
END;
$$;

-- ============================================================
-- RPC: check_furore_remote_token — returns basic info without exposing token/PIN
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_furore_remote_token(p_token text)
RETURNS TABLE(access_id uuid, name text, pin_required boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update last_used_at
  UPDATE public.furore_remote_access
  SET last_used_at = now()
  WHERE access_token = p_token
    AND is_active = true;

  RETURN QUERY
  SELECT 
    fra.id AS access_id,
    fra.name,
    fra.pin_required
  FROM public.furore_remote_access fra
  WHERE fra.access_token = p_token
    AND fra.is_active = true
  LIMIT 1;
END;
$$;

-- ============================================================
-- RPC: validate_furore_remote_pin — validates PIN server-side
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_furore_remote_pin(p_access_id uuid, p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.furore_remote_access
    WHERE id = p_access_id
      AND is_active = true
      AND pin_code = UPPER(TRIM(p_pin))
  );
END;
$$;
