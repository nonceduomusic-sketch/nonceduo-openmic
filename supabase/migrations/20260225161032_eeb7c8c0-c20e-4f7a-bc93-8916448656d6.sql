
CREATE OR REPLACE FUNCTION public.furore_atomic_book(
  p_session_id uuid,
  p_player_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_next_pos integer;
  v_session_status text;
BEGIN
  -- Serialize access per session
  PERFORM pg_advisory_xact_lock(hashtext('furore_book_' || p_session_id::text));

  -- Check session is open
  SELECT status INTO v_session_status
  FROM public.furore_sessions
  WHERE id = p_session_id;

  IF v_session_status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'Session not open';
  END IF;

  -- Check player not already booked
  IF EXISTS (
    SELECT 1 FROM public.furore_bookings
    WHERE session_id = p_session_id AND player_id = p_player_id
  ) THEN
    RETURN -1; -- already booked
  END IF;

  -- Atomic next position
  SELECT COALESCE(MAX(position), 0) + 1
  INTO v_next_pos
  FROM public.furore_bookings
  WHERE session_id = p_session_id;

  INSERT INTO public.furore_bookings (session_id, player_id, position)
  VALUES (p_session_id, p_player_id, v_next_pos);

  RETURN v_next_pos;
END;
$$;
