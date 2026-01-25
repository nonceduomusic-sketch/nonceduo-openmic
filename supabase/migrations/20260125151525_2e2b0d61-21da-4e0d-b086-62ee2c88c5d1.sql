-- =====================================================
-- LIVE INTERATTIVO
-- Reazioni emoji live e votazione performance
-- =====================================================

-- Tabella per le reazioni emoji durante l'evento
CREATE TABLE public.live_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emoji TEXT NOT NULL,
  session_fingerprint TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella per i voti alle performance
CREATE TABLE public.performance_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  voter_fingerprint TEXT NOT NULL,
  voter_user_id UUID,
  vote_type TEXT NOT NULL DEFAULT 'up', -- 'up' | 'fire' | 'heart'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(reservation_id, voter_fingerprint)
);

-- Conteggio voti aggregato per performance
CREATE TABLE public.performance_vote_counts (
  reservation_id UUID PRIMARY KEY REFERENCES public.reservations(id) ON DELETE CASCADE,
  total_votes INTEGER NOT NULL DEFAULT 0,
  fire_votes INTEGER NOT NULL DEFAULT 0,
  heart_votes INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_vote_counts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Chiunque può vedere le reazioni" 
ON public.live_reactions 
FOR SELECT 
USING (true);

CREATE POLICY "Chiunque può inviare reazioni" 
ON public.live_reactions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Chiunque può vedere i voti" 
ON public.performance_votes 
FOR SELECT 
USING (true);

CREATE POLICY "Chiunque può votare" 
ON public.performance_votes 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Chiunque può vedere i conteggi" 
ON public.performance_vote_counts 
FOR SELECT 
USING (true);

CREATE POLICY "Sistema può gestire conteggi" 
ON public.performance_vote_counts 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Indici
CREATE INDEX idx_reactions_created ON public.live_reactions(created_at DESC);
CREATE INDEX idx_votes_reservation ON public.performance_votes(reservation_id);
CREATE INDEX idx_vote_counts_total ON public.performance_vote_counts(total_votes DESC);

-- Trigger per aggiornare conteggi voti
CREATE OR REPLACE FUNCTION public.update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.performance_vote_counts (reservation_id, total_votes, fire_votes, heart_votes)
  VALUES (
    NEW.reservation_id, 
    1,
    CASE WHEN NEW.vote_type = 'fire' THEN 1 ELSE 0 END,
    CASE WHEN NEW.vote_type = 'heart' THEN 1 ELSE 0 END
  )
  ON CONFLICT (reservation_id) DO UPDATE SET
    total_votes = performance_vote_counts.total_votes + 1,
    fire_votes = performance_vote_counts.fire_votes + 
      CASE WHEN NEW.vote_type = 'fire' THEN 1 ELSE 0 END,
    heart_votes = performance_vote_counts.heart_votes + 
      CASE WHEN NEW.vote_type = 'heart' THEN 1 ELSE 0 END,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_update_vote_counts
AFTER INSERT ON public.performance_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_vote_counts();

-- Auto-cleanup delle reazioni dopo 1 ora (per non accumulare troppi dati)
CREATE OR REPLACE FUNCTION public.cleanup_old_reactions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.live_reactions 
  WHERE created_at < now() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.performance_vote_counts;