import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAllCachedSongs, cacheSongsCatalog } from '@/lib/songsCatalogCache';
import { safeGetItem } from '@/lib/safeStorage';

export interface CatalogSong {
  id: string;
  title: string;
  artist: string;
}

/** Try fetching catalog from the LAN mini-server */
async function fetchFromLocalServer(): Promise<CatalogSong[]> {
  const localIP = safeGetItem('local', 'broadcast_local_ip') || '';
  if (!localIP) return [];
  try {
    const resp = await fetch(`http://${localIP}:8080/api/catalog/list`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!Array.isArray(data)) return [];
    return data.map((s: any) => ({
      id: s.id || s.slug || s.titolo,
      title: s.titolo || s.title || '',
      artist: s.artista || s.artist || '',
    }));
  } catch {
    return [];
  }
}

/** Try fetching catalog from IndexedDB cache */
async function fetchFromCache(): Promise<CatalogSong[]> {
  try {
    const cached = await getAllCachedSongs();
    return cached.map(s => ({
      id: s.id,
      title: s.titolo,
      artist: s.artista,
    }));
  } catch {
    return [];
  }
}

/**
 * Hook per caricare le canzoni dal database.
 * Fallback chain: Cloud → LAN server → IndexedDB cache.
 */
export const useSongsCatalog = () => {
  const [songs, setSongs] = useState<CatalogSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'cloud' | 'lan' | 'cache' | null>(null);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        setLoading(true);

        // 1) Try Cloud (Supabase) — with timeout to avoid hanging offline
        let cloudData: any[] | null = null;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);
          const { data, error: fetchError } = await supabase
            .from('songs')
            .select('id, titolo, artista')
            .order('titolo', { ascending: true })
            .abortSignal(controller.signal);
          clearTimeout(timeout);

          if (!fetchError && data && data.length > 0) {
            cloudData = data;
          }
        } catch {
          console.log('[Catalog] Cloud fetch timeout/failed, trying LAN...');
        }

        if (cloudData && cloudData.length > 0) {
          const mapped: CatalogSong[] = cloudData.map(song => ({
            id: song.id,
            title: song.titolo,
            artist: song.artista,
          }));
          setSongs(mapped);
          setSource('cloud');
          setError(null);
          // Also update IndexedDB cache in background
          cacheSongsCatalog(cloudData.map(s => ({ ...s, testo: null, slug: null }))).catch(() => {});
          setLoading(false);
          return;
        }

        // 2) Try LAN mini-server
        console.log('[Catalog] Cloud unavailable, trying LAN server...');
        const lanSongs = await fetchFromLocalServer();
        if (lanSongs.length > 0) {
          setSongs(lanSongs);
          setSource('lan');
          setError(null);
          setLoading(false);
          return;
        }

        // 3) Try IndexedDB cache
        console.log('[Catalog] LAN unavailable, trying IndexedDB cache...');
        const cachedSongs = await fetchFromCache();
        if (cachedSongs.length > 0) {
          setSongs(cachedSongs);
          setSource('cache');
          setError(null);
          setLoading(false);
          return;
        }

        // All sources failed
        
        setSongs([]);
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

  return { songs, loading, error, source };
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
