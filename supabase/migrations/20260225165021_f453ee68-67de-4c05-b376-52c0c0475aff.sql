
-- 1) Improved furore_award_and_reset with RAISE LOG for debugging
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
  v_booking_count integer;
BEGIN
  -- Lock to prevent concurrent resets
  PERFORM pg_advisory_xact_lock(hashtext('furore_reset_' || p_session_id::text));

  -- Count bookings first
  SELECT count(*) INTO v_booking_count
  FROM public.furore_bookings
  WHERE session_id = p_session_id;
  
  RAISE LOG '[furore_award_and_reset] session=%, bookings_found=%', p_session_id, v_booking_count;

  -- Get scoring rules
  SELECT scoring_rules INTO v_rules
  FROM public.furore_sessions
  WHERE id = p_session_id;

  IF v_rules IS NULL OR v_rules = '{}'::jsonb THEN
    v_rules := '{"1":10,"2":7,"3":5,"4":3,"5":1}'::jsonb;
  END IF;
  
  RAISE LOG '[furore_award_and_reset] scoring_rules=%', v_rules;

  -- Award points for each booking
  FOR v_booking IN
    SELECT player_id, position
    FROM public.furore_bookings
    WHERE session_id = p_session_id
    ORDER BY position ASC
  LOOP
    v_points := COALESCE((v_rules->>v_booking.position::text)::integer, 0);
    RAISE LOG '[furore_award_and_reset] player=%, position=%, points=%', v_booking.player_id, v_booking.position, v_points;
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

  RAISE LOG '[furore_award_and_reset] completed, awarded=% players', v_awarded;
  RETURN v_awarded;
END;
$$;

-- 2) New RPC for full reset (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.furore_full_reset(p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('furore_reset_' || p_session_id::text));

  -- Delete all bookings first (FK constraint)
  DELETE FROM public.furore_bookings WHERE session_id = p_session_id;
  
  -- Delete all players
  DELETE FROM public.furore_players WHERE session_id = p_session_id;
  
  -- Set session to closed
  UPDATE public.furore_sessions
  SET status = 'closed', updated_at = now()
  WHERE id = p_session_id;

  RETURN true;
END;
$$;
