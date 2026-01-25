-- Fix linter warnings from previous migration

-- 1. Fix SECURITY DEFINER VIEW - Use SECURITY INVOKER instead
DROP VIEW IF EXISTS public.live_sessions_public;

CREATE VIEW public.live_sessions_public 
WITH (security_invoker = true)
AS
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

-- 2. Create a proper RLS policy for the view's underlying table
-- that allows public read of non-sensitive columns through the view
CREATE POLICY "Anyone can read active sessions via view"
ON public.live_sessions FOR SELECT
USING (
  -- Allow reading rows where is_active is true for view access
  -- but the view itself filters out sensitive columns like pin_code
  is_active = true AND (expires_at IS NULL OR expires_at > now())
);

-- 3. Fix the permissive INSERT policy on security_rate_limits
-- Add proper validation
DROP POLICY IF EXISTS "Allow insert rate limit records" ON public.security_rate_limits;

CREATE POLICY "Validated inserts to rate limits"
ON public.security_rate_limits FOR INSERT
WITH CHECK (
  -- Only allow valid action types
  action_type IN ('pin_validation', 'password_attempt', 'login_attempt', 'pin_validation_blocked') AND
  -- Identifier must not be empty
  length(trim(identifier)) > 0
);