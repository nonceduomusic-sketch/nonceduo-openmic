-- =====================================================
-- GAMIFICATION SYSTEM
-- Badge, Punti, Streak e Classifiche per Open Mic/Dediche
-- =====================================================

-- Tabella per tracciare le partecipazioni degli utenti (per streak e statistiche)
CREATE TABLE public.user_participations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_name TEXT NOT NULL,
  session_fingerprint TEXT, -- Per identificare utenti anonimi
  user_id UUID, -- Per utenti registrati (futuro)
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  format_type TEXT NOT NULL DEFAULT 'openmic', -- 'openmic' | 'dediche'
  points_earned INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella per i badge guadagnati
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_name TEXT NOT NULL,
  session_fingerprint TEXT,
  user_id UUID,
  badge_key TEXT NOT NULL, -- es: 'first_song', 'streak_3', 'top_singer'
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  badge_icon TEXT NOT NULL DEFAULT '🏆',
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(participant_name, badge_key)
);

-- Tabella per le statistiche aggregate (classifica)
CREATE TABLE public.leaderboard_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_name TEXT NOT NULL UNIQUE,
  session_fingerprint TEXT,
  user_id UUID,
  total_songs INTEGER NOT NULL DEFAULT 0,
  total_dedications INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  max_streak INTEGER NOT NULL DEFAULT 0,
  last_participation_date DATE,
  badges_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Tutti possono leggere le classifiche/badge pubblici
CREATE POLICY "Chiunque può vedere le partecipazioni" 
ON public.user_participations 
FOR SELECT 
USING (true);

CREATE POLICY "Chiunque può vedere i badge" 
ON public.user_badges 
FOR SELECT 
USING (true);

CREATE POLICY "Chiunque può vedere la classifica" 
ON public.leaderboard_stats 
FOR SELECT 
USING (true);

-- Solo il sistema può inserire (via edge function o trigger)
CREATE POLICY "Sistema può inserire partecipazioni" 
ON public.user_participations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Sistema può inserire badge" 
ON public.user_badges 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Sistema può gestire classifica" 
ON public.leaderboard_stats 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Indici per performance
CREATE INDEX idx_participations_name ON public.user_participations(participant_name);
CREATE INDEX idx_participations_date ON public.user_participations(event_date);
CREATE INDEX idx_badges_name ON public.user_badges(participant_name);
CREATE INDEX idx_leaderboard_points ON public.leaderboard_stats(total_points DESC);
CREATE INDEX idx_leaderboard_songs ON public.leaderboard_stats(total_songs DESC);

-- Trigger per aggiornare leaderboard automaticamente dopo una nuova prenotazione
CREATE OR REPLACE FUNCTION public.update_leaderboard_on_reservation()
RETURNS TRIGGER AS $$
DECLARE
  v_last_date DATE;
  v_streak INTEGER;
  v_points INTEGER;
  v_is_dedication BOOLEAN;
BEGIN
  -- Determina se è una dedica
  v_is_dedication := (NEW.dedication_message IS NOT NULL AND NEW.dedication_message <> '');
  
  -- Punti: 10 base, +5 per dedica
  v_points := 10;
  IF v_is_dedication THEN
    v_points := v_points + 5;
  END IF;

  -- Inserisci partecipazione
  INSERT INTO public.user_participations (
    participant_name, 
    reservation_id, 
    event_date, 
    format_type,
    points_earned
  ) VALUES (
    NEW.customer_name,
    NEW.id,
    CURRENT_DATE,
    CASE WHEN v_is_dedication THEN 'dediche' ELSE 'openmic' END,
    v_points
  );

  -- Upsert leaderboard
  INSERT INTO public.leaderboard_stats (
    participant_name,
    total_songs,
    total_dedications,
    total_points,
    current_streak,
    max_streak,
    last_participation_date
  ) VALUES (
    NEW.customer_name,
    1,
    CASE WHEN v_is_dedication THEN 1 ELSE 0 END,
    v_points,
    1,
    1,
    CURRENT_DATE
  )
  ON CONFLICT (participant_name) DO UPDATE SET
    total_songs = leaderboard_stats.total_songs + 1,
    total_dedications = leaderboard_stats.total_dedications + 
      CASE WHEN v_is_dedication THEN 1 ELSE 0 END,
    total_points = leaderboard_stats.total_points + v_points,
    -- Calcola streak: se l'ultima partecipazione era ieri, incrementa
    current_streak = CASE 
      WHEN leaderboard_stats.last_participation_date = CURRENT_DATE - INTERVAL '1 day' 
      THEN leaderboard_stats.current_streak + 1
      WHEN leaderboard_stats.last_participation_date = CURRENT_DATE 
      THEN leaderboard_stats.current_streak
      ELSE 1
    END,
    max_streak = GREATEST(
      leaderboard_stats.max_streak, 
      CASE 
        WHEN leaderboard_stats.last_participation_date = CURRENT_DATE - INTERVAL '1 day' 
        THEN leaderboard_stats.current_streak + 1
        WHEN leaderboard_stats.last_participation_date = CURRENT_DATE 
        THEN leaderboard_stats.current_streak
        ELSE 1
      END
    ),
    last_participation_date = CURRENT_DATE,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger
CREATE TRIGGER trg_update_leaderboard
AFTER INSERT ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_leaderboard_on_reservation();

-- Funzione per assegnare badge automaticamente
CREATE OR REPLACE FUNCTION public.check_and_award_badges()
RETURNS TRIGGER AS $$
DECLARE
  v_stats RECORD;
BEGIN
  -- Ottieni statistiche aggiornate
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

  -- Aggiorna contatore badge
  UPDATE public.leaderboard_stats 
  SET badges_count = (
    SELECT COUNT(*) FROM public.user_badges WHERE participant_name = NEW.participant_name
  )
  WHERE participant_name = NEW.participant_name;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger per badge
CREATE TRIGGER trg_check_badges
AFTER INSERT OR UPDATE ON public.leaderboard_stats
FOR EACH ROW
EXECUTE FUNCTION public.check_and_award_badges();

-- Abilita realtime per le classifiche
ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;