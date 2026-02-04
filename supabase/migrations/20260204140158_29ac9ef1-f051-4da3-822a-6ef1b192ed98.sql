-- =============================================
-- BROADCAST / TRASMETTI SYSTEM
-- =============================================

-- Tabella sessioni broadcast (una per sala/TV)
CREATE TABLE public.broadcast_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_code TEXT NOT NULL UNIQUE DEFAULT 'main',
  sala_name TEXT NOT NULL DEFAULT 'Sala Principale',
  is_active BOOLEAN NOT NULL DEFAULT false,
  current_song_id UUID REFERENCES public.songs(id) ON DELETE SET NULL,
  current_reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  display_mode TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'lyrics', 'promo'
  scroll_position INTEGER DEFAULT 0,
  highlight_line INTEGER DEFAULT 0,
  auto_scroll BOOLEAN DEFAULT true,
  scroll_speed INTEGER DEFAULT 3, -- 1-5
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Tabella scalette salvate
CREATE TABLE public.broadcast_setlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabella canzoni nelle scalette
CREATE TABLE public.broadcast_setlist_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_id UUID NOT NULL REFERENCES public.broadcast_setlists(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indici per performance
CREATE INDEX idx_broadcast_sessions_sala ON public.broadcast_sessions(sala_code);
CREATE INDEX idx_broadcast_sessions_active ON public.broadcast_sessions(is_active);
CREATE INDEX idx_broadcast_setlists_user ON public.broadcast_setlists(created_by);
CREATE INDEX idx_broadcast_setlist_songs_setlist ON public.broadcast_setlist_songs(setlist_id);
CREATE INDEX idx_broadcast_setlist_songs_position ON public.broadcast_setlist_songs(setlist_id, position);

-- Enable RLS
ALTER TABLE public.broadcast_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_setlist_songs ENABLE ROW LEVEL SECURITY;

-- Trigger per updated_at
CREATE TRIGGER update_broadcast_sessions_updated_at
  BEFORE UPDATE ON public.broadcast_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_broadcast_setlists_updated_at
  BEFORE UPDATE ON public.broadcast_setlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime per broadcast_sessions (per sincronizzazione TV)
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_sessions;

-- =============================================
-- PERMESSI PER ASSISTENTE E TRASMETTI
-- =============================================

-- Inserisci nuovi permessi
INSERT INTO public.permissions (name, description) VALUES
  -- Assistente granulare
  ('operator.assistente_view', 'Visualizza conversazioni assistente'),
  ('operator.assistente_manage', 'Gestisce conversazioni assistente (no delete)'),
  ('operator.assistente_full', 'Controllo completo assistente (include delete)'),
  -- Trasmetti granulare
  ('operator.trasmetti_view', 'Visualizza sezione trasmetti'),
  ('operator.trasmetti_manage', 'Controlla trasmissione karaoke'),
  ('operator.trasmetti_full', 'Gestione completa scalette e sale')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- RLS POLICIES per broadcast
-- =============================================

-- broadcast_sessions: lettura pubblica (per TV), scrittura solo staff/operatori autorizzati
CREATE POLICY "Public can read broadcast sessions"
  ON public.broadcast_sessions FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage broadcast sessions"
  ON public.broadcast_sessions FOR ALL
  TO authenticated
  USING (
    public.is_owner(auth.uid()) OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'moderator'::app_role) OR
    (public.is_operator(auth.uid()) AND public.has_permission(auth.uid(), 'operator.trasmetti_manage'))
  );

-- broadcast_setlists: solo creatore o staff con permessi
CREATE POLICY "Users can view their own setlists"
  ON public.broadcast_setlists FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    public.is_owner(auth.uid()) OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'moderator'::app_role) OR
    (public.is_operator(auth.uid()) AND public.has_permission(auth.uid(), 'operator.trasmetti_view'))
  );

CREATE POLICY "Staff can manage setlists"
  ON public.broadcast_setlists FOR ALL
  TO authenticated
  USING (
    created_by = auth.uid() OR
    public.is_owner(auth.uid()) OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    (public.is_operator(auth.uid()) AND public.has_permission(auth.uid(), 'operator.trasmetti_full'))
  );

-- broadcast_setlist_songs: accesso tramite setlist
CREATE POLICY "Users can view setlist songs"
  ON public.broadcast_setlist_songs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.broadcast_setlists s
      WHERE s.id = setlist_id AND (
        s.created_by = auth.uid() OR
        public.is_owner(auth.uid()) OR
        public.has_role(auth.uid(), 'admin'::app_role) OR
        public.has_role(auth.uid(), 'moderator'::app_role) OR
        (public.is_operator(auth.uid()) AND public.has_permission(auth.uid(), 'operator.trasmetti_view'))
      )
    )
  );

CREATE POLICY "Staff can manage setlist songs"
  ON public.broadcast_setlist_songs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.broadcast_setlists s
      WHERE s.id = setlist_id AND (
        s.created_by = auth.uid() OR
        public.is_owner(auth.uid()) OR
        public.has_role(auth.uid(), 'admin'::app_role) OR
        (public.is_operator(auth.uid()) AND public.has_permission(auth.uid(), 'operator.trasmetti_full'))
      )
    )
  );

-- Crea sessione broadcast di default
INSERT INTO public.broadcast_sessions (sala_code, sala_name, is_active, display_mode)
VALUES ('main', 'Sala Principale', false, 'waiting')
ON CONFLICT (sala_code) DO NOTHING;