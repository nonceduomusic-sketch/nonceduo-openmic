import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('titolo', { ascending: true });

    if (error) {
      console.error('Error fetching songs:', error);
      toast.error('Errore nel caricamento delle canzoni');
      setSongs([]);
    } else {
      setSongs((data || []) as Song[]);
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
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching song:', error);
      return null;
    }

    return data as Song;
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
