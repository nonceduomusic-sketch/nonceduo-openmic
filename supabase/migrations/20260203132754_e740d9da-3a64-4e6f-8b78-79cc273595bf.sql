-- Create songs table for storing song lyrics
CREATE TABLE public.songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titolo TEXT NOT NULL,
  artista TEXT NOT NULL,
  testo TEXT,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster searches
CREATE INDEX idx_songs_titolo ON public.songs USING gin(to_tsvector('italian', titolo));
CREATE INDEX idx_songs_artista ON public.songs USING gin(to_tsvector('italian', artista));
CREATE INDEX idx_songs_slug ON public.songs(slug);

-- Create unique constraint on titolo + artista for upsert
CREATE UNIQUE INDEX idx_songs_titolo_artista ON public.songs(LOWER(titolo), LOWER(artista));

-- Function to generate slug automatically
CREATE OR REPLACE FUNCTION public.generate_song_slug()
RETURNS TRIGGER AS $$
BEGIN
  NEW.slug := LOWER(REGEXP_REPLACE(REGEXP_REPLACE(NEW.titolo || '-' || NEW.artista, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-generate slug on insert/update
CREATE TRIGGER trigger_generate_song_slug
BEFORE INSERT OR UPDATE ON public.songs
FOR EACH ROW
EXECUTE FUNCTION public.generate_song_slug();

-- Enable RLS
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can read songs
CREATE POLICY "Anyone can view songs"
ON public.songs
FOR SELECT
USING (true);

-- Only staff can manage songs
CREATE POLICY "Staff can manage songs"
ON public.songs
FOR ALL
USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Enable realtime for songs table
ALTER PUBLICATION supabase_realtime ADD TABLE public.songs;

-- Add comment for documentation
COMMENT ON TABLE public.songs IS 'Catalogo canzoni con testi per Open Mic e Dediche';