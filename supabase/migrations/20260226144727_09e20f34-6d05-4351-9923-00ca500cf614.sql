
-- Add auto_scoring column to furore_sessions (default true for backward compat)
ALTER TABLE public.furore_sessions ADD COLUMN IF NOT EXISTS auto_scoring boolean NOT NULL DEFAULT true;

-- Update the auto-score trigger to check the session's auto_scoring flag
CREATE OR REPLACE FUNCTION public.furore_auto_assign_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rules jsonb;
  v_points integer;
  v_auto_scoring boolean;
BEGIN
  -- Check if auto_scoring is enabled for this session
  SELECT auto_scoring INTO v_auto_scoring
  FROM public.furore_sessions
  WHERE id = NEW.session_id;

  IF NOT COALESCE(v_auto_scoring, true) THEN
    RETURN NEW; -- Skip automatic scoring
  END IF;

  -- Get scoring rules from the session
  SELECT COALESCE(scoring_rules, '{"1":10,"2":7,"3":5,"4":3,"5":1}'::jsonb)
  INTO v_rules
  FROM public.furore_sessions
  WHERE id = NEW.session_id;

  v_points := COALESCE((v_rules->>NEW.position::text)::integer, 0);

  IF v_points > 0 THEN
    UPDATE public.furore_players
    SET score = score + v_points
    WHERE id = NEW.player_id;
  END IF;

  RETURN NEW;
END;
$$;
