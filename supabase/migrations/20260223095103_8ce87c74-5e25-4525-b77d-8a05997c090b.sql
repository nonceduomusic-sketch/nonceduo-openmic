
-- Tabella di collegamento Catalogo ↔ SongBook (completamente separata)
CREATE TABLE public.catalog_songbook_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  songbook_file_id UUID NOT NULL REFERENCES public.songbook_files(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  match_confidence REAL DEFAULT NULL,
  linked_by TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'auto'
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID DEFAULT NULL,
  UNIQUE(song_id, songbook_file_id)
);

-- Indici per performance
CREATE INDEX idx_catalog_songbook_links_song ON public.catalog_songbook_links(song_id);
CREATE INDEX idx_catalog_songbook_links_file ON public.catalog_songbook_links(songbook_file_id);

-- RLS
ALTER TABLE public.catalog_songbook_links ENABLE ROW LEVEL SECURITY;

-- Chiunque può leggere i link (serve per il broadcast)
CREATE POLICY "Anyone can view catalog songbook links"
  ON public.catalog_songbook_links FOR SELECT
  USING (true);

-- Staff può gestire i link
CREATE POLICY "Staff can manage catalog songbook links"
  ON public.catalog_songbook_links FOR ALL
  USING (
    is_owner(auth.uid()) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'moderator'::app_role)
  )
  WITH CHECK (
    is_owner(auth.uid()) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'moderator'::app_role)
  );

-- Trigger per updated_at
CREATE TRIGGER update_catalog_songbook_links_updated_at
  BEFORE UPDATE ON public.catalog_songbook_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Abilita Realtime per aggiornamenti live
ALTER PUBLICATION supabase_realtime ADD TABLE public.catalog_songbook_links;
