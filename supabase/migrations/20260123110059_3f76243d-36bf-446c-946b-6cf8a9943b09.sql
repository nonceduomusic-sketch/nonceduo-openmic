-- Update live_sessions table to support multiple formats per session
-- Add columns for format selection and unique link

ALTER TABLE public.live_sessions 
ADD COLUMN IF NOT EXISTS protected_formats text[] DEFAULT ARRAY['openmic', 'dediche']::text[],
ADD COLUMN IF NOT EXISTS custom_pin text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS event_link_code text DEFAULT NULL;

-- Create unique index on event_link_code for active sessions
CREATE UNIQUE INDEX IF NOT EXISTS idx_live_sessions_event_link_active 
ON public.live_sessions(event_link_code) 
WHERE is_active = true AND event_link_code IS NOT NULL;

-- Update the section column to be more flexible (keep for backward compatibility but use 'global' for new sessions)
COMMENT ON COLUMN public.live_sessions.section IS 'Legacy: use protected_formats instead. For new sessions, use section=global with protected_formats array';

-- Function to check if a specific format is protected by an active live session
CREATE OR REPLACE FUNCTION public.is_format_protected(p_format text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.live_sessions
    WHERE is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND p_format = ANY(protected_formats)
  );
END;
$$;

-- Function to get the active session for a format (if protected)
CREATE OR REPLACE FUNCTION public.get_active_session_for_format(p_format text)
RETURNS TABLE(id uuid, pin_code text, protected_formats text[], event_link_code text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ls.id, ls.pin_code, ls.protected_formats, ls.event_link_code, ls.expires_at
  FROM public.live_sessions ls
  WHERE ls.is_active = true
    AND (ls.expires_at IS NULL OR ls.expires_at > now())
    AND p_format = ANY(ls.protected_formats)
  LIMIT 1;
END;
$$;

-- Function to validate PIN for a specific format
CREATE OR REPLACE FUNCTION public.validate_format_pin(p_format text, p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.live_sessions
    WHERE is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND p_format = ANY(protected_formats)
      AND pin_code = UPPER(TRIM(p_pin))
  );
END;
$$;

-- Function to get session by event link code
CREATE OR REPLACE FUNCTION public.get_session_by_link_code(p_link_code text)
RETURNS TABLE(id uuid, pin_code text, protected_formats text[], expires_at timestamptz, is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ls.id, ls.pin_code, ls.protected_formats, ls.expires_at, ls.is_active
  FROM public.live_sessions ls
  WHERE ls.event_link_code = p_link_code
    AND ls.is_active = true
    AND (ls.expires_at IS NULL OR ls.expires_at > now())
  LIMIT 1;
END;
$$;