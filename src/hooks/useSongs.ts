import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cacheSongsCatalog, getAllCachedSongs, getCachedSongById } from '@/lib/songsCatalogCache';

export interface Song {
  id: string;
  titolo: string;
  artista: string;
  testo: string | null;
  slug: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface SongInput {
  titolo: string;
  artista: string;
  testo?: string;
}

export const useSongs = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const queryClient = useQueryClient();
  const hasHydratedFromCache = useRef(false);

  const fetchSongs = useCallback(async () => {
    setLoading(true);

    // 1) Hydrate from IndexedDB immediately (only once)
    if (!hasHydratedFromCache.current) {
      hasHydratedFromCache.current = true;
      try {
        const cached = await getAllCachedSongs();
        if (cached.length > 0) {
          const mapped: Song[] = cached.map(c => ({
            id: c.id,
            titolo: c.titolo,
            artista: c.artista,
            testo: c.testo,
            slug: c.slug,
            created_at: '',
            updated_at: null,
          })).sort((a, b) => a.titolo.localeCompare(b.titolo, 'it'));
          setSongs(mapped);
          setIsFromCache(true);
          setLoading(false);
        }
      } catch (e) {
        // cache miss, continue to network
      }
    }

    // 2) Fetch from network (with timeout to avoid hanging offline)
    try {
      // Fetch all songs using pagination to bypass the 1000-row default limit
      const allSongs: Song[] = [];
      const PAGE_SIZE = 1000;
      let from = 0;
      let keepFetching = true;

      while (keepFetching) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const { data: page, error: pageError } = await supabase
          .from('songs')
          .select('*')
          .order('titolo', { ascending: true })
          .range(from, from + PAGE_SIZE - 1)
          .abortSignal(controller.signal);
        clearTimeout(timeout);

        if (pageError) throw pageError;
        if (page && page.length > 0) {
          allSongs.push(...(page as Song[]));
          from += page.length;
          if (page.length < PAGE_SIZE) keepFetching = false;
        } else {
          keepFetching = false;
        }
      }

      const data = allSongs;
      const error = null;

      if (error) {
        console.error('Error fetching songs:', error);
        // Don't overwrite cache data if network fails
        if (songs.length === 0) {
          toast.error('Errore nel caricamento delle canzoni');
        }
      } else {
        const fetchedSongs = (data || []) as Song[];
        setSongs(fetchedSongs);
        setIsFromCache(false);
        // 3) Update IndexedDB cache in background
        cacheSongsCatalog(fetchedSongs).catch(() => {});
      }
    } catch {
      console.warn('[useSongs] Network fetch timeout/failed, using cache data');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSongs();

    // Subscribe to realtime updates
    const channelName = `songs-changes-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'songs',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSongs((prev) => [...prev, payload.new as Song].sort((a, b) => 
              a.titolo.localeCompare(b.titolo, 'it')
            ));
          } else if (payload.eventType === 'UPDATE') {
            setSongs((prev) =>
              prev.map((s) => (s.id === payload.new.id ? (payload.new as Song) : s))
                .sort((a, b) => a.titolo.localeCompare(b.titolo, 'it'))
            );
          } else if (payload.eventType === 'DELETE') {
            setSongs((prev) => prev.filter((s) => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSongs]);

  const createSong = async (input: SongInput): Promise<boolean> => {
    try {
      const { error } = await supabase.from('songs').insert({
        titolo: input.titolo.trim(),
        artista: input.artista.trim(),
        testo: input.testo?.trim() || null,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('Questa canzone esiste già nel catalogo');
        } else {
          throw error;
        }
        return false;
      }

      toast.success('Canzone aggiunta con successo!');
      return true;
    } catch (error: any) {
      console.error('Error creating song:', error);
      toast.error(error.message || 'Errore durante il salvataggio');
      return false;
    }
  };

  const updateSong = async (id: string, input: SongInput): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('songs')
        .update({
          titolo: input.titolo.trim(),
          artista: input.artista.trim(),
          testo: input.testo?.trim() || null,
        })
        .eq('id', id);

      if (error) {
        if (error.code === '23505') {
          toast.error('Esiste già una canzone con questo titolo e artista');
        } else {
          throw error;
        }
        return false;
      }

      toast.success('Canzone aggiornata con successo!');
      return true;
    } catch (error: any) {
      console.error('Error updating song:', error);
      toast.error(error.message || 'Errore durante l\'aggiornamento');
      return false;
    }
  };

  const deleteSong = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('songs').delete().eq('id', id);

      if (error) throw error;

      toast.success('Canzone eliminata');
      return true;
    } catch (error: any) {
      console.error('Error deleting song:', error);
      toast.error(error.message || 'Errore durante l\'eliminazione');
      return false;
    }
  };

  const deleteAllSongs = async (): Promise<boolean> => {
    try {
      const { error } = await supabase.from('songs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      toast.success('Tutte le canzoni sono state eliminate');
      setSongs([]);
      return true;
    } catch (error: any) {
      console.error('Error deleting all songs:', error);
      toast.error(error.message || 'Errore durante l\'eliminazione');
      return false;
    }
  };

  const getSongById = async (id: string): Promise<Song | null> => {
    // Try network first with timeout
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('id', id)
        .abortSignal(controller.signal)
        .single();
      clearTimeout(timeout);

      if (data) return data as Song;

      if (error) {
        console.warn('getSongById network failed, trying cache:', error);
      }
    } catch {
      console.warn('[getSongById] Network timeout, trying cache');
    }

    // Fallback to cache
    const cached = await getCachedSongById(id);
    if (cached) {
      return {
        id: cached.id,
        titolo: cached.titolo,
        artista: cached.artista,
        testo: cached.testo,
        slug: cached.slug,
        created_at: '',
        updated_at: null,
      };
    }

    return null;
  };

  const getSongBySlug = async (slug: string): Promise<Song | null> => {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('Error fetching song by slug:', error);
      return null;
    }

    return data as Song;
  };

  // Bulk import for CSV data
  const importSongs = async (songsData: SongInput[]): Promise<{ success: number; errors: number }> => {
    let success = 0;
    let errors = 0;

    for (const song of songsData) {
      const { error } = await supabase.from('songs').upsert(
        {
          titolo: song.titolo.trim(),
          artista: song.artista.trim(),
          testo: song.testo?.trim() || null,
        },
        {
          onConflict: 'idx_songs_titolo_artista',
          ignoreDuplicates: false,
        }
      );

      if (error) {
        console.error('Error importing song:', song.titolo, error);
        errors++;
      } else {
        success++;
      }
    }

    if (success > 0) {
      toast.success(`Importate ${success} canzoni con successo!`);
    }
    if (errors > 0) {
      toast.error(`${errors} canzoni non importate (errori)`);
    }

    await fetchSongs();
    return { success, errors };
  };

  return {
    songs,
    loading,
    isFromCache,
    refetch: fetchSongs,
    createSong,
    updateSong,
    deleteSong,
    deleteAllSongs,
    getSongById,
    getSongBySlug,
    importSongs,
  };
};
