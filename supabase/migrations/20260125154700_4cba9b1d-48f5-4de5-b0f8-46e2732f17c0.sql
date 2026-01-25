
-- Fix infinite recursion in check_and_award_badges trigger
-- The UPDATE on leaderboard_stats was triggering itself

CREATE OR REPLACE FUNCTION public.check_and_award_badges()
RETURNS TRIGGER AS $$
DECLARE
  v_stats RECORD;
  v_new_badge_count INTEGER;
BEGIN
  -- Skip if this is just a badges_count update (prevents recursion)
  IF TG_OP = 'UPDATE' AND OLD.badges_count IS DISTINCT FROM NEW.badges_count 
     AND OLD.total_songs = NEW.total_songs 
     AND OLD.total_dedications = NEW.total_dedications 
     AND OLD.current_streak = NEW.current_streak THEN
    RETURN NEW;
  END IF;

  -- Get updated stats
  SELECT * INTO v_stats FROM public.leaderboard_stats 
  WHERE participant_name = NEW.participant_name;

  IF v_stats IS NULL THEN
    RETURN NEW;
  END IF;

  -- Badge: Prima Canzone
  IF v_stats.total_songs = 1 THEN
    INSERT INTO public.user_badges (participant_name, badge_key, badge_name, badge_description, badge_icon)
    VALUES (NEW.participant_name, 'first_song', 'Prima Canzone!', 'Hai prenotato la tua prima canzone', '🎤')
    ON CONFLICT (participant_name, badge_key) DO NOTHING;
  END IF;

  -- Badge: 5 Canzoni
  IF v_stats.total_songs = 5 THEN
    INSERT INTO public.user_badges (participant_name, badge_key, badge_name, badge_description, badge_icon)
    VALUES (NEW.participant_name, 'songs_5', 'Voce Emergente', 'Hai prenotato 5 canzoni', '⭐')
    ON CONFLICT (participant_name, badge_key) DO NOTHING;
  END IF;

  -- Badge: 10 Canzoni
  IF v_stats.total_songs = 10 THEN
    INSERT INTO public.user_badges (participant_name, badge_key, badge_name, badge_description, badge_icon)
    VALUES (NEW.participant_name, 'songs_10', 'Star del Karaoke', 'Hai prenotato 10 canzoni', '🌟')
    ON CONFLICT (participant_name, badge_key) DO NOTHING;
  END IF;

  -- Badge: 25 Canzoni
  IF v_stats.total_songs = 25 THEN
    INSERT INTO public.user_badges (participant_name, badge_key, badge_name, badge_description, badge_icon)
    VALUES (NEW.participant_name, 'songs_25', 'Leggenda', 'Hai prenotato 25 canzoni', '👑')
    ON CONFLICT (participant_name, badge_key) DO NOTHING;
  END IF;

  -- Badge: Prima Dedica
  IF v_stats.total_dedications = 1 THEN
    INSERT INTO public.user_badges (participant_name, badge_key, badge_name, badge_description, badge_icon)
    VALUES (NEW.participant_name, 'first_dedication', 'Cuore Romantico', 'Hai inviato la tua prima dedica', '❤️')
    ON CONFLICT (participant_name, badge_key) DO NOTHING;
  END IF;

  -- Badge: Streak 3
  IF v_stats.current_streak = 3 THEN
    INSERT INTO public.user_badges (participant_name, badge_key, badge_name, badge_description, badge_icon)
    VALUES (NEW.participant_name, 'streak_3', 'On Fire!', '3 serate consecutive', '🔥')
    ON CONFLICT (participant_name, badge_key) DO NOTHING;
  END IF;

  -- Badge: Streak 7
  IF v_stats.current_streak = 7 THEN
    INSERT INTO public.user_badges (participant_name, badge_key, badge_name, badge_description, badge_icon)
    VALUES (NEW.participant_name, 'streak_7', 'Settimana Perfetta', '7 serate consecutive', '💎')
    ON CONFLICT (participant_name, badge_key) DO NOTHING;
  END IF;

  -- Count badges (without triggering another update cycle)
  SELECT COUNT(*) INTO v_new_badge_count 
  FROM public.user_badges 
  WHERE participant_name = NEW.participant_name;

  -- Only update if badge count actually changed
  IF v_new_badge_count IS DISTINCT FROM v_stats.badges_count THEN
    UPDATE public.leaderboard_stats 
    SET badges_count = v_new_badge_count
    WHERE participant_name = NEW.participant_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
