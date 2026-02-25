
-- Trigger function: auto-assign score when a booking is inserted
CREATE OR REPLACE FUNCTION public.furore_auto_assign_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scoring_rules jsonb;
  v_points integer;
BEGIN
  -- Get scoring rules from the session
  SELECT scoring_rules INTO v_scoring_rules
  FROM furore_sessions
  WHERE id = NEW.session_id;

  -- Look up points for this position
  v_points := COALESCE((v_scoring_rules ->> NEW.position::text)::integer, 0);

  -- Add points to the player's score
  IF v_points > 0 THEN
    UPDATE furore_players
    SET score = score + v_points
    WHERE id = NEW.player_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on furore_bookings
DROP TRIGGER IF EXISTS trg_furore_auto_score ON public.furore_bookings;
CREATE TRIGGER trg_furore_auto_score
  AFTER INSERT ON public.furore_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.furore_auto_assign_score();
