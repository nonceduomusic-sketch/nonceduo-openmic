import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CatalogSong {
  id: string;
  title: string;
  artist: string;
}

/**
 * Hook per caricare le canzoni dal database.
 * Usare questo hook invece dell'import statico da @/data/songs
 * per avere sempre i dati sincronizzati e senza duplicati.
 */
export const useSongsCatalog = () => {
  const [songs, setSongs] = useState<CatalogSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('songs')
          .select('id, titolo, artista')
          .order('titolo', { ascending: true });

        if (fetchError) throw fetchError;

        // Mappa i dati dal database al formato usato nell'app
        const mappedSongs: CatalogSong[] = (data || []).map(song => ({
          id: song.id,
          title: song.titolo,
          artist: song.artista,
        }));

        setSongs(mappedSongs);
        setError(null);
      } catch (err) {
        console.error('Error fetching songs:', err);
        setError(err instanceof Error ? err.message : 'Errore nel caricamento delle canzoni');
      } finally {
        setLoading(false);
      }
    };

    fetchSongs();
  }, []);

  return { songs, loading, error };
};

/**
 * Hook per filtrare le canzoni con ricerca e filtro artista.
 * Restituisce le canzoni filtrate in base ai criteri.
 */
export const useFilteredSongs = (
  songs: CatalogSong[],
  search: string,
  artistFilter: string
) => {
  return useMemo(() => {
    return songs.filter((song) => {
      const searchLower = search.toLowerCase().trim();
      
      // Se non c'è ricerca, mostra tutto (filtrato per artista se necessario)
      if (!searchLower) {
        return artistFilter === 'all' || song.artist === artistFilter;
      }

      // Cerca sia nel titolo che nell'artista
      const matchesSearch =
        song.title.toLowerCase().includes(searchLower) ||
        song.artist.toLowerCase().includes(searchLower);

      const matchesArtist =
        artistFilter === 'all' || song.artist === artistFilter;

      return matchesSearch && matchesArtist;
    });
  }, [songs, search, artistFilter]);
};

/**
 * Hook per ottenere la lista unica degli artisti.
 */
export const useArtistsList = (songs: CatalogSong[]) => {
  return useMemo(() => {
    const uniqueArtists = [...new Set(songs.map((s) => s.artist))].sort();
    return uniqueArtists;
  }, [songs]);
};
