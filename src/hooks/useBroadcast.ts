import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface BroadcastSession {
  id: string;
  sala_code: string;
  sala_name: string;
  is_active: boolean;
  current_song_id: string | null;
  current_reservation_id: string | null;
  display_mode: 'waiting' | 'lyrics' | 'promo';
  scroll_position: number;
  highlight_line: number;
  auto_scroll: boolean;
  scroll_speed: number;
  tv_view_mode: 'compact' | 'karaoke' | 'spotify';
  is_broadcasting: boolean;
  highlight_enabled: boolean; // When true, active line is highlighted; when false, all text visible
  highlight_lines_count: number; // Number of lines to highlight (1, 2, or 3)
  font_size: number; // Font size percentage (50-150)
  text_align: 'left' | 'center' | 'right'; // Text alignment
  remote_scroll_enabled: boolean; // When false, remote can only use buttons, no scroll sync
  // Screen share fields (JSON types to match DB)
  screen_share_active: boolean;
  screen_share_offer: Record<string, unknown> | null;
  screen_share_answer: Record<string, unknown> | null;
  screen_share_ice_candidates: Record<string, unknown>[];
  screen_share_started_at: string | null;
  screen_share_stopped_reason: string | null;
  // ScreenStream fields (external app streaming)
  screen_stream_active: boolean;
  screen_stream_url: string | null;
  // SongBook fields
  songbook_file_id: string | null;
  songbook_mode: boolean;
  songbook_show_chords_on_tv: boolean;
  songbook_transpose: number;
  songbook_view_mode: 'compact' | 'karaoke' | 'spotify' | 'chordpro';
  broadcast_to_tv: boolean;
  broadcast_to_partiture: boolean;
  created_at: string;
  updated_at: string;
}

export interface BroadcastSetlist {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface BroadcastSetlistSong {
  id: string;
  setlist_id: string;
  song_id: string;
  position: number;
  notes: string | null;
  created_at: string;
  // Joined fields
  song?: {
    id: string;
    titolo: string;
    artista: string;
    testo: string | null;
  };
}

export function useBroadcast(salaCode: string = 'main') {
  const [session, setSession] = useState<BroadcastSession | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Fetch session
  const fetchSession = useCallback(async () => {
    const { data, error } = await supabase
      .from('broadcast_sessions')
      .select('*')
      .eq('sala_code', salaCode)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching broadcast session:', error);
    }
    
    setSession(data as BroadcastSession | null);
    setLoading(false);
  }, [salaCode]);

  // Subscribe to realtime updates
  useEffect(() => {
    fetchSession();

    const channel = supabase
      .channel(`broadcast-${salaCode}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'broadcast_sessions',
          filter: `sala_code=eq.${salaCode}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setSession(payload.new as BroadcastSession);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSession, salaCode]);

  // Update session (admin only)
  const updateSession = useCallback(async (updates: Partial<BroadcastSession>) => {
    const { error } = await supabase
      .from('broadcast_sessions')
      .update(updates as any)
      .eq('sala_code', salaCode);

    if (error) {
      console.error('Error updating broadcast session:', error);
      toast.error('Errore aggiornamento trasmissione');
      return false;
    }
    return true;
  }, [salaCode]);

  // Broadcast a song (set current_song_id and switch to lyrics mode)
  // IMPORTANT: Always reset songbook_mode to avoid conflicts when switching from SongBook to catalog
  const broadcastSong = useCallback(async (songId: string, reservationId?: string) => {
    return updateSession({
      current_song_id: songId,
      current_reservation_id: reservationId || null,
      display_mode: 'lyrics',
      scroll_position: 0,
      highlight_line: 0,
      is_active: true,
      songbook_mode: false,
      songbook_file_id: null,
    } as any);
  }, [updateSession]);

  // Stop broadcast (return to waiting screen)
  // IMPORTANT: Always reset songbook state to avoid stale mode
  const stopBroadcast = useCallback(async () => {
    return updateSession({
      current_song_id: null,
      current_reservation_id: null,
      display_mode: 'waiting',
      scroll_position: 0,
      highlight_line: 0,
      songbook_mode: false,
      songbook_file_id: null,
    } as any);
  }, [updateSession]);

  // Toggle active state
  const toggleActive = useCallback(async (active: boolean) => {
    return updateSession({ is_active: active });
  }, [updateSession]);

  return {
    session,
    loading,
    updateSession,
    broadcastSong,
    stopBroadcast,
    toggleActive,
    refetch: fetchSession,
  };
}

// Hook for managing setlists
export function useBroadcastSetlists() {
  const [setlists, setSetlists] = useState<BroadcastSetlist[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSetlists = useCallback(async () => {
    const { data, error } = await supabase
      .from('broadcast_setlists')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching setlists:', error);
    }
    setSetlists((data || []) as BroadcastSetlist[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSetlists();
  }, [fetchSetlists]);

  const createSetlist = useCallback(async (name: string, description?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Devi essere autenticato');
      return null;
    }

    const { data, error } = await supabase
      .from('broadcast_setlists')
      .insert({ name, description, created_by: user.id })
      .select()
      .single();

    if (error) {
      console.error('Error creating setlist:', error);
      toast.error('Errore creazione scaletta');
      return null;
    }

    await fetchSetlists();
    toast.success('Scaletta creata!');
    return data as BroadcastSetlist;
  }, [fetchSetlists]);

  const updateSetlist = useCallback(async (id: string, updates: Partial<BroadcastSetlist>) => {
    const { error } = await supabase
      .from('broadcast_setlists')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating setlist:', error);
      toast.error('Errore aggiornamento scaletta');
      return false;
    }

    await fetchSetlists();
    return true;
  }, [fetchSetlists]);

  const deleteSetlist = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('broadcast_setlists')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting setlist:', error);
      toast.error('Errore eliminazione scaletta');
      return false;
    }

    await fetchSetlists();
    toast.success('Scaletta eliminata');
    return true;
  }, [fetchSetlists]);

  return {
    setlists,
    loading,
    createSetlist,
    updateSetlist,
    deleteSetlist,
    refetch: fetchSetlists,
  };
}

// Hook for managing songs in a setlist
export function useBroadcastSetlistSongs(setlistId: string | null) {
  const [songs, setSongs] = useState<BroadcastSetlistSong[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSongs = useCallback(async () => {
    if (!setlistId) {
      setSongs([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('broadcast_setlist_songs')
      .select(`
        *,
        song:songs(id, titolo, artista, testo)
      `)
      .eq('setlist_id', setlistId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching setlist songs:', error);
    }
    setSongs((data || []) as BroadcastSetlistSong[]);
    setLoading(false);
  }, [setlistId]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const addSong = useCallback(async (songId: string, position?: number) => {
    if (!setlistId) return false;

    const nextPosition = position ?? songs.length;
    
    const { error } = await supabase
      .from('broadcast_setlist_songs')
      .insert({ setlist_id: setlistId, song_id: songId, position: nextPosition });

    if (error) {
      console.error('Error adding song to setlist:', error);
      toast.error('Errore aggiunta canzone');
      return false;
    }

    await fetchSongs();
    return true;
  }, [setlistId, songs.length, fetchSongs]);

  const removeSong = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('broadcast_setlist_songs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error removing song from setlist:', error);
      toast.error('Errore rimozione canzone');
      return false;
    }

    await fetchSongs();
    return true;
  }, [fetchSongs]);

  const reorderSongs = useCallback(async (orderedIds: string[]) => {
    // Update positions based on array order
    const updates = orderedIds.map((id, index) => ({
      id,
      position: index,
    }));

    for (const update of updates) {
      await supabase
        .from('broadcast_setlist_songs')
        .update({ position: update.position })
        .eq('id', update.id);
    }

    await fetchSongs();
  }, [fetchSongs]);

  return {
    songs,
    loading,
    addSong,
    removeSong,
    reorderSongs,
    refetch: fetchSongs,
  };
}
