
-- ============================================
-- GAMES SYSTEM - Database Schema
-- ============================================

-- 1. Game Settings (global + per-game toggles)
CREATE TABLE public.game_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  games_enabled boolean NOT NULL DEFAULT false,
  show_on_app boolean NOT NULL DEFAULT true,
  show_on_tv boolean NOT NULL DEFAULT false,
  available_when_closed boolean NOT NULL DEFAULT false,
  available_in_consultable boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid DEFAULT NULL
);

ALTER TABLE public.game_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read game settings" ON public.game_settings
  FOR SELECT USING (true);

CREATE POLICY "Staff can manage game settings" ON public.game_settings
  FOR ALL USING (
    is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
  ) WITH CHECK (
    is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Insert default row
INSERT INTO public.game_settings (id) VALUES (gen_random_uuid());

-- 2. Individual game configs
CREATE TABLE public.game_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_key text NOT NULL UNIQUE,
  game_name text NOT NULL,
  game_icon text NOT NULL DEFAULT '🎮',
  is_enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.game_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read game configs" ON public.game_configs
  FOR SELECT USING (true);

CREATE POLICY "Staff can manage game configs" ON public.game_configs
  FOR ALL USING (
    is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
  ) WITH CHECK (
    is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Insert the 4 games
INSERT INTO public.game_configs (game_key, game_name, game_icon, sort_order) VALUES
  ('quiz', 'Quiz Musicale', '🎵', 1),
  ('tetris', 'Tetris', '🧱', 2),
  ('pong', 'Pong', '🏓', 3),
  ('tris', 'Tris', '❌', 4);

-- 3. Game Scores (leaderboard)
CREATE TABLE public.game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_key text NOT NULL REFERENCES public.game_configs(game_key) ON DELETE CASCADE,
  nickname text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  played_at timestamptz NOT NULL DEFAULT now(),
  is_seed boolean NOT NULL DEFAULT false
);

ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read game scores" ON public.game_scores
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert game scores" ON public.game_scores
  FOR INSERT WITH CHECK (
    length(trim(nickname)) > 0 AND length(nickname) <= 50 AND score >= 0
  );

CREATE POLICY "Staff can manage game scores" ON public.game_scores
  FOR ALL USING (
    is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
  ) WITH CHECK (
    is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE INDEX idx_game_scores_leaderboard ON public.game_scores(game_key, score DESC);

-- 4. Quiz Question Sets (elenchi di domande a tema)
CREATE TABLE public.quiz_question_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.quiz_question_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active question sets" ON public.quiz_question_sets
  FOR SELECT USING (true);

CREATE POLICY "Staff can manage question sets" ON public.quiz_question_sets
  FOR ALL USING (
    is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
  ) WITH CHECK (
    is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 5. Quiz Questions
CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_set_id uuid REFERENCES public.quiz_question_sets(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text,
  option_d text,
  correct_option text NOT NULL DEFAULT 'a',
  difficulty integer NOT NULL DEFAULT 1,
  auto_generated boolean NOT NULL DEFAULT false,
  source_song_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read quiz questions" ON public.quiz_questions
  FOR SELECT USING (true);

CREATE POLICY "Staff can manage quiz questions" ON public.quiz_questions
  FOR ALL USING (
    is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
  ) WITH CHECK (
    is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE INDEX idx_quiz_questions_set ON public.quiz_questions(question_set_id);

-- Seed fake scores (7-8 per game)
INSERT INTO public.game_scores (game_key, nickname, score, is_seed, played_at) VALUES
  ('quiz', 'Marco R.', 850, true, now() - interval '2 days'),
  ('quiz', 'Giulia S.', 720, true, now() - interval '3 days'),
  ('quiz', 'Luca P.', 680, true, now() - interval '1 day'),
  ('quiz', 'Sara M.', 650, true, now() - interval '4 days'),
  ('quiz', 'Andrea B.', 600, true, now() - interval '5 days'),
  ('quiz', 'Valentina C.', 550, true, now() - interval '2 days'),
  ('quiz', 'Francesco D.', 500, true, now() - interval '6 days'),
  ('tetris', 'Luca P.', 12500, true, now() - interval '1 day'),
  ('tetris', 'Marco R.', 9800, true, now() - interval '3 days'),
  ('tetris', 'Sara M.', 8700, true, now() - interval '2 days'),
  ('tetris', 'Andrea B.', 7200, true, now() - interval '4 days'),
  ('tetris', 'Giulia S.', 6100, true, now() - interval '5 days'),
  ('tetris', 'Valentina C.', 5500, true, now() - interval '3 days'),
  ('tetris', 'Chiara L.', 4800, true, now() - interval '6 days'),
  ('pong', 'Andrea B.', 15, true, now() - interval '2 days'),
  ('pong', 'Luca P.', 12, true, now() - interval '1 day'),
  ('pong', 'Marco R.', 10, true, now() - interval '3 days'),
  ('pong', 'Sara M.', 9, true, now() - interval '4 days'),
  ('pong', 'Giulia S.', 8, true, now() - interval '5 days'),
  ('pong', 'Francesco D.', 7, true, now() - interval '2 days'),
  ('pong', 'Chiara L.', 6, true, now() - interval '6 days'),
  ('tris', 'Giulia S.', 20, true, now() - interval '1 day'),
  ('tris', 'Marco R.', 18, true, now() - interval '3 days'),
  ('tris', 'Andrea B.', 15, true, now() - interval '2 days'),
  ('tris', 'Luca P.', 12, true, now() - interval '4 days'),
  ('tris', 'Sara M.', 10, true, now() - interval '5 days'),
  ('tris', 'Valentina C.', 8, true, now() - interval '3 days'),
  ('tris', 'Francesco D.', 6, true, now() - interval '6 days');

-- Seed default question set with sample quiz questions
INSERT INTO public.quiz_question_sets (id, name, description, is_active, is_default)
VALUES ('00000000-0000-0000-0000-000000000001', 'Domande Casuali (Default)', 'Mix di domande musicali generali', true, true);

INSERT INTO public.quiz_questions (question_set_id, question_text, option_a, option_b, option_c, option_d, correct_option, difficulty) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Chi ha cantato "Nel blu dipinto di blu"?', 'Domenico Modugno', 'Adriano Celentano', 'Lucio Battisti', 'Mina', 'a', 1),
  ('00000000-0000-0000-0000-000000000001', 'Quale band ha scritto "Bohemian Rhapsody"?', 'The Beatles', 'Queen', 'Led Zeppelin', 'Pink Floyd', 'b', 1),
  ('00000000-0000-0000-0000-000000000001', 'In che anno è uscito "Thriller" di Michael Jackson?', '1980', '1982', '1984', '1986', 'b', 2),
  ('00000000-0000-0000-0000-000000000001', 'Chi è il frontman dei Måneskin?', 'Thomas Raggi', 'Damiano David', 'Ethan Torchio', 'Victoria De Angelis', 'b', 1),
  ('00000000-0000-0000-0000-000000000001', 'Quale canzone inizia con "Is this the real life?"', 'Stairway to Heaven', 'Hotel California', 'Bohemian Rhapsody', 'Imagine', 'c', 1),
  ('00000000-0000-0000-0000-000000000001', 'Quante corde ha una chitarra standard?', '4', '5', '6', '8', 'c', 1),
  ('00000000-0000-0000-0000-000000000001', 'Chi ha vinto Sanremo 2023?', 'Lazza', 'Marco Mengoni', 'Mr. Rain', 'Ultimo', 'b', 2),
  ('00000000-0000-0000-0000-000000000001', 'Quale nota musicale non esiste?', 'Do', 'Re', 'Hi', 'Sol', 'c', 1),
  ('00000000-0000-0000-0000-000000000001', 'Chi ha composto le "Quattro Stagioni"?', 'Mozart', 'Beethoven', 'Vivaldi', 'Bach', 'c', 2),
  ('00000000-0000-0000-0000-000000000001', 'Quale strumento suona un DJ?', 'Pianoforte', 'Giradischi/CDJ', 'Violino', 'Batteria', 'b', 1);

-- Enable realtime for game_scores
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_scores;
