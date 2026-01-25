-- =============================================================
-- SECURITY HARDENING MIGRATION - Phase 1
-- Fixes: PIN exposure, push_subscriptions, rate limiting
-- =============================================================

-- 1. Create rate limiting table for PIN/password attempts
CREATE TABLE IF NOT EXISTS public.security_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- Can be session_id, IP, or composite key
  action_type TEXT NOT NULL, -- 'pin_validation', 'password_attempt', 'login_attempt'
  target_id UUID, -- Optional: live_session_id, conversation_id, etc.
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false
);

-- Index for efficient rate limit checks
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
ON public.security_rate_limits(identifier, action_type, attempted_at DESC);

-- Enable RLS on rate limits
ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow inserts (no reads for regular users)
CREATE POLICY "Allow insert rate limit records"
ON public.security_rate_limits FOR INSERT
WITH CHECK (true);

-- Staff can view for monitoring
CREATE POLICY "Staff can view rate limits"
ON public.security_rate_limits FOR SELECT
USING (
  is_owner(auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- 2. Create a secure view for live_sessions that excludes pin_code
-- This is what the client should query instead of the table directly
CREATE OR REPLACE VIEW public.live_sessions_public AS
SELECT 
  id,
  section,
  protected_formats,
  event_link_code,
  expires_at,
  is_active,
  created_at
FROM public.live_sessions
WHERE is_active = true
  AND (expires_at IS NULL OR expires_at > now());

-- Grant access to the view
GRANT SELECT ON public.live_sessions_public TO anon, authenticated;

-- 3. Drop the overly permissive policy on live_sessions
DROP POLICY IF EXISTS "Anyone can validate active PINs" ON public.live_sessions;

-- 4. Create more restrictive policy - only staff can read full data
CREATE POLICY "Only staff can view full live_sessions"
ON public.live_sessions FOR SELECT
USING (
  is_owner(auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);

-- 5. Update validate_live_session_pin to include rate limiting
CREATE OR REPLACE FUNCTION public.validate_live_session_pin(
  p_section TEXT,
  p_pin TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  -- Perform validation
  v_is_valid := EXISTS (
    SELECT 1 FROM public.live_sessions
    WHERE section = p_section
      AND pin_code = UPPER(TRIM(p_pin))
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  );
  
  -- Log the attempt
  INSERT INTO public.security_rate_limits (identifier, action_type, success)
  VALUES (v_session_id, 'pin_validation', v_is_valid);
  
  RETURN v_is_valid;
END;
$$;

-- 6. Create a unified PIN validation function that also validates against event_booking_rules
CREATE OR REPLACE FUNCTION public.validate_event_pin(
  p_pin TEXT,
  p_format TEXT DEFAULT NULL
) RETURNS TABLE(
  is_valid BOOLEAN,
  live_session_id UUID,
  protected_formats TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id TEXT;
  v_attempt_count INT;
BEGIN
  -- Get session ID from request headers
  v_session_id := COALESCE(
    current_setting('request.headers', true)::json->>'x-session-id',
    'anonymous'
  );
  
  -- Check rate limit
  SELECT COUNT(*) INTO v_attempt_count
  FROM public.security_rate_limits
  WHERE identifier = v_session_id
    AND action_type = 'pin_validation'
    AND attempted_at > now() - interval '1 hour'
    AND success = false;
    
  IF v_attempt_count >= 10 THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT[];
    RETURN;
  END IF;
  
  -- Try to validate against live_sessions first
  RETURN QUERY
  SELECT 
    true AS is_valid,
    ls.id AS live_session_id,
    ls.protected_formats
  FROM public.live_sessions ls
  WHERE ls.pin_code = UPPER(TRIM(p_pin))
    AND ls.is_active = true
    AND (ls.expires_at IS NULL OR ls.expires_at > now())
    AND (p_format IS NULL OR p_format = ANY(ls.protected_formats))
  LIMIT 1;
  
  -- Log attempt (only if we have a result)
  IF FOUND THEN
    INSERT INTO public.security_rate_limits (identifier, action_type, success)
    VALUES (v_session_id, 'pin_validation', true);
  ELSE
    INSERT INTO public.security_rate_limits (identifier, action_type, success)
    VALUES (v_session_id, 'pin_validation', false);
  END IF;
  
  RETURN;
END;
$$;

-- 7. Fix push_subscriptions RLS - make it secure
-- First drop all existing policies
DROP POLICY IF EXISTS "Allow delete push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow insert push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow read push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow update push subscriptions" ON public.push_subscriptions;

-- Create secure policies
CREATE POLICY "Users can manage own push subscriptions"
ON public.push_subscriptions FOR ALL
USING (
  -- Staff can manage all
  is_owner(auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  -- Users can only see their own (by endpoint match or user_identifier)
  user_identifier = auth.uid()::text OR
  user_identifier = (current_setting('request.headers', true)::json->>'x-session-id')
)
WITH CHECK (
  user_identifier = auth.uid()::text OR
  user_identifier = (current_setting('request.headers', true)::json->>'x-session-id') OR
  is_owner(auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- 8. Fix conversation_participants - restrict visibility
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;

CREATE POLICY "Participants and staff can view conversation members"
ON public.conversation_participants FOR SELECT
USING (
  -- Staff can see all
  is_owner(auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role) OR
  -- Users can only see participants of conversations they're in
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND (
      cp.session_id = (current_setting('request.headers', true)::json->>'x-session-id') OR
      cp.user_id = auth.uid()
    )
  ) OR
  -- Public groups are visible to authenticated users
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_participants.conversation_id
    AND c.is_public = true 
    AND c.is_group = true
    AND auth.uid() IS NOT NULL
  )
);

-- 9. Auto-cleanup old rate limit records (keep 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.security_rate_limits
  WHERE attempted_at < now() - interval '7 days';
END;
$$;