-- Add a field to track when all sessions were invalidated (for realtime trigger)
ALTER TABLE public.live_sessions 
ADD COLUMN IF NOT EXISTS sessions_invalidated_at timestamp with time zone DEFAULT NULL;

-- Update the invalidate_pin_sessions function to also update live_sessions
CREATE OR REPLACE FUNCTION public.invalidate_pin_sessions(p_live_session_id uuid, p_reason text DEFAULT 'pin_changed'::text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Invalidate all pin sessions
  UPDATE public.pin_sessions
  SET 
    is_valid = false,
    invalidated_at = now(),
    invalidation_reason = p_reason
  WHERE live_session_id = p_live_session_id
    AND is_valid = true;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- IMPORTANT: Update live_sessions to trigger realtime for ALL connected users
  -- This allows users to receive invalidation even if they can't see pin_sessions changes
  UPDATE public.live_sessions
  SET sessions_invalidated_at = now()
  WHERE id = p_live_session_id;
  
  RETURN v_count;
END;
$$;