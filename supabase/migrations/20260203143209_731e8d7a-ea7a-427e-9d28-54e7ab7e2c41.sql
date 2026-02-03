-- Add unique constraint on titolo + artista for upsert support
ALTER TABLE public.songs 
ADD CONSTRAINT songs_titolo_artista_unique UNIQUE (titolo, artista);