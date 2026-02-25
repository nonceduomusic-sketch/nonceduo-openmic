
-- Furore Pulsantiera: session managed by admin
CREATE TABLE public.furore_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status text NOT NULL DEFAULT 'closed', -- 'closed' | 'open' | 'locked'
  max_players integer NOT NULL DEFAULT 8,
  show_order_to_players boolean NOT NULL DEFAULT true,
  sound_key text NOT NULL DEFAULT 'bell1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

-- Players who joined the session (nickname + symbol)
CREATE TABLE public.furore_players (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.furore_sessions(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  symbol text NOT NULL DEFAULT '🎤',
  photo_url text,
  color text NOT NULL DEFAULT '#FF6B6B',
  device_fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Buzzer bookings (who pressed, in what order)
CREATE TABLE public.furore_bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.furore_sessions(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.furore_players(id) ON DELETE CASCADE,
  position integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_furore_players_session ON public.furore_players(session_id);
CREATE INDEX idx_furore_bookings_session ON public.furore_bookings(session_id);
CREATE UNIQUE INDEX idx_furore_bookings_unique_player ON public.furore_bookings(session_id, player_id);

-- RLS
ALTER TABLE public.furore_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.furore_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.furore_bookings ENABLE ROW LEVEL SECURITY;

-- furore_sessions: anyone can read, staff can manage
CREATE POLICY "Anyone can read furore sessions" ON public.furore_sessions FOR SELECT USING (true);
CREATE POLICY "Staff can manage furore sessions" ON public.furore_sessions FOR ALL USING (
  is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)
);

-- furore_players: anyone can read and insert, staff can delete
CREATE POLICY "Anyone can read furore players" ON public.furore_players FOR SELECT USING (true);
CREATE POLICY "Anyone can join as player" ON public.furore_players FOR INSERT WITH CHECK (
  length(btrim(nickname)) > 0 AND length(nickname) <= 50
);
CREATE POLICY "Staff can manage furore players" ON public.furore_players FOR ALL USING (
  is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)
);

-- furore_bookings: anyone can read and insert, staff can manage
CREATE POLICY "Anyone can read furore bookings" ON public.furore_bookings FOR SELECT USING (true);
CREATE POLICY "Anyone can create booking" ON public.furore_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can manage furore bookings" ON public.furore_bookings FOR ALL USING (
  is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.furore_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.furore_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.furore_bookings;
