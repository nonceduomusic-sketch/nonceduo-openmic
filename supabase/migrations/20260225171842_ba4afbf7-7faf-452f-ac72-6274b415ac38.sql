
-- Update furore_award_and_reset to NOT award points (trigger handles it now)
-- It just deletes bookings and reopens the session
CREATE OR REPLACE FUNCTION public.furore_award_and_reset(p_session_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_count integer;
BEGIN
  -- Lock to prevent concurrent resets
  PERFORM pg_advisory_xact_lock(hashtext('furore_reset_' || p_session_id::text));

  -- Count bookings
  SELECT count(*) INTO v_booking_count
  FROM public.furore_bookings
  WHERE session_id = p_session_id;

  -- Delete all bookings (points already assigned by trigger on insert)
  DELETE FROM public.furore_bookings WHERE session_id = p_session_id;

  -- Reopen session
  UPDATE public.furore_sessions
  SET status = 'open', updated_at = now()
  WHERE id = p_session_id;

  RETURN v_booking_count;
END;
$$;
