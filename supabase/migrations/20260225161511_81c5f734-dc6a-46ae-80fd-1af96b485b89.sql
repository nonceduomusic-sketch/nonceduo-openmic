
CREATE OR REPLACE FUNCTION public.furore_award_and_reset(p_session_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_booking RECORD;
  v_rules jsonb;
  v_points integer;
  v_awarded integer := 0;
BEGIN
  -- Lock to prevent concurrent resets
  PERFORM pg_advisory_xact_lock(hashtext('furore_reset_' || p_session_id::text));

  -- Get scoring rules
  SELECT scoring_rules INTO v_rules
  FROM public.furore_sessions
  WHERE id = p_session_id;

  IF v_rules IS NULL THEN
    v_rules := '{"1":10,"2":7,"3":5,"4":3,"5":1}'::jsonb;
  END IF;

  -- Award points for each booking
  FOR v_booking IN
    SELECT player_id, position
    FROM public.furore_bookings
    WHERE session_id = p_session_id
    ORDER BY position ASC
  LOOP
    v_points := COALESCE((v_rules->>v_booking.position::text)::integer, 0);
    IF v_points > 0 THEN
      UPDATE public.furore_players
      SET score = score + v_points
      WHERE id = v_booking.player_id;
      v_awarded := v_awarded + 1;
    END IF;
  END LOOP;

  -- Delete all bookings
  DELETE FROM public.furore_bookings WHERE session_id = p_session_id;

  -- Reopen session
  UPDATE public.furore_sessions
  SET status = 'open', updated_at = now()
  WHERE id = p_session_id;

  RETURN v_awarded;
END;
$$;
