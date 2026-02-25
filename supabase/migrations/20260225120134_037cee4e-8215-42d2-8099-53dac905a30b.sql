
-- Drop the header-based policies (they won't work reliably)
DROP POLICY IF EXISTS "Players can delete own booking" ON public.furore_bookings;
DROP POLICY IF EXISTS "Players can delete themselves" ON public.furore_players;

-- Create a server-side function that handles player exit securely
CREATE OR REPLACE FUNCTION public.furore_player_exit(p_player_id uuid, p_session_id uuid, p_device_fingerprint text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_valid boolean;
BEGIN
  -- Verify the player exists and the fingerprint matches
  SELECT EXISTS (
    SELECT 1 FROM public.furore_players
    WHERE id = p_player_id
      AND session_id = p_session_id
      AND device_fingerprint = p_device_fingerprint
  ) INTO v_valid;

  IF NOT v_valid THEN
    RETURN false;
  END IF;

  -- Delete booking first (FK constraint)
  DELETE FROM public.furore_bookings
  WHERE player_id = p_player_id AND session_id = p_session_id;

  -- Delete player
  DELETE FROM public.furore_players
  WHERE id = p_player_id AND session_id = p_session_id;

  RETURN true;
END;
$$;
