import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useBroadcastChannel } from '@/hooks/useBroadcastChannel';

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
  highlight_lines_count: number; // Number of lines to highlight (1-6)
  highlight_style: 'gradient' | 'uniform' | 'uniform-gradient'; // gradient = main brighter, uniform = all same, uniform-gradient = all prominent
  font_size: number; // Font size percentage (50-200)
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
  dual_broadcast: boolean;
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
  const sessionRef = useRef<BroadcastSession | null>(null);

  // Keep ref in sync for use in callbacks
  useEffect(() => { sessionRef.current = session; }, [session]);

  // Track last broadcast update timestamp to prevent DB overwriting faster broadcast updates
  const lastBroadcastUpdateRef = useRef<number>(0);

  // Default session skeleton for offline bootstrapping
  const defaultSessionRef = useRef<BroadcastSession>({
    id: 'offline',
    sala_code: salaCode,
    sala_name: 'Sala Principale',
    is_active: false,
    current_song_id: null,
    current_reservation_id: null,
    display_mode: 'waiting',
    scroll_position: 0,
    highlight_line: 0,
    auto_scroll: true,
    scroll_speed: 3,
    tv_view_mode: 'karaoke',
    is_broadcasting: false,
    highlight_enabled: true,
    highlight_lines_count: 1,
    highlight_style: 'gradient',
    font_size: 100,
    text_align: 'center',
    remote_scroll_enabled: true,
    screen_share_active: false,
    screen_share_offer: null,
    screen_share_answer: null,
    screen_share_ice_candidates: [],
    screen_share_started_at: null,
    screen_share_stopped_reason: null,
    screen_stream_active: false,
    screen_stream_url: null,
    songbook_file_id: null,
    songbook_mode: false,
    songbook_show_chords_on_tv: false,
    songbook_transpose: 0,
    songbook_view_mode: 'chordpro',
    broadcast_to_tv: true,
    broadcast_to_partiture: true,
    dual_broadcast: false,
    created_at: '',
    updated_at: '',
  } as BroadcastSession);

  // Instant peer-to-peer broadcast channel
  const { send: broadcastSend } = useBroadcastChannel({
    salaCode,
    onUpdate: useCallback((payload: Record<string, unknown>) => {
      // Apply partial update instantly from peer broadcast
      // CRITICAL: if session is null (offline), bootstrap from default so updates are not lost
      lastBroadcastUpdateRef.current = Date.now();
      setSession(prev => {
        const base = prev || defaultSessionRef.current;
        return { ...base, ...payload } as BroadcastSession;
      });
    }, []),
  });

  // Fetch session — with timeout to avoid hanging offline
  const fetchSession = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const { data, error } = await supabase
        .from('broadcast_sessions')
        .select('*')
        .eq('sala_code', salaCode)
        .abortSignal(controller.signal)
        .single();
      clearTimeout(timeout);

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching broadcast session:', error);
      }
      
      setSession(data as BroadcastSession | null);
    } catch (e) {
      console.warn('[Broadcast] Session fetch timeout/failed, bootstrapping default session for offline');
      // Bootstrap a default session so BroadcastChannel / WS updates can be applied
      setSession(prev => prev || defaultSessionRef.current);
    } finally {
      setLoading(false);
    }
  }, [salaCode]);

  // Subscribe to realtime updates (DB persistence layer - backup for broadcast)
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
            const now = Date.now();
            const timeSinceLastBroadcast = now - lastBroadcastUpdateRef.current;
            
            // If a broadcast channel update happened very recently (<500ms ago),
            // skip this postgres_changes update to avoid stutter/flicker.
            // The broadcast channel already applied the latest state.
            if (timeSinceLastBroadcast < 500) {
              return;
            }
            
            setSession(payload.new as BroadcastSession);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSession, salaCode]);

  // Debounced DB persistence for high-frequency updates (scroll, highlight)
  const dbPersistTimerRef = useRef<number | null>(null);
  const pendingDbUpdatesRef = useRef<Partial<BroadcastSession>>({});
  
  const flushDbUpdates = useCallback(() => {
    dbPersistTimerRef.current = null;
    const updates = pendingDbUpdatesRef.current;
    pendingDbUpdatesRef.current = {};
    if (Object.keys(updates).length === 0) return;
    
    supabase
      .from('broadcast_sessions')
      .update(updates as any)
      .eq('sala_code', salaCode)
      .then(({ error }) => {
        if (error) console.error('Error persisting broadcast update:', error);
      });
  }, [salaCode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dbPersistTimerRef.current) window.clearTimeout(dbPersistTimerRef.current);
      // Flush any pending updates
      const pending = pendingDbUpdatesRef.current;
      if (Object.keys(pending).length > 0) {
        supabase.from('broadcast_sessions').update(pending as any).eq('sala_code', salaCode);
      }
    };
  }, [salaCode]);

  // High-frequency fields that should be debounced to DB
  const HIGH_FREQ_KEYS = new Set(['scroll_position', 'highlight_line']);

  // Update session: broadcast instantly to peers, then persist to DB in background
  const updateSession = useCallback(async (updates: Partial<BroadcastSession>) => {
    // 1. Apply locally immediately (bootstrap from default if null)
    setSession(prev => {
      const base = prev || defaultSessionRef.current;
      return { ...base, ...updates } as BroadcastSession;
    });
    
    // 2. Broadcast to all peers instantly (~20ms)
    broadcastSend(updates as Record<string, unknown>);
    
    // 3. Persist to DB (fire-and-forget with timeout to avoid hanging offline)
    const isHighFreq = Object.keys(updates).every(k => HIGH_FREQ_KEYS.has(k));
    
    if (isHighFreq) {
      // Merge into pending and debounce (100ms for snappy persistence)
      pendingDbUpdatesRef.current = { ...pendingDbUpdatesRef.current, ...updates };
      if (!dbPersistTimerRef.current) {
        dbPersistTimerRef.current = window.setTimeout(flushDbUpdates, 100);
      }
    } else {
      // Flush any pending + send this immediately
      if (dbPersistTimerRef.current) {
        window.clearTimeout(dbPersistTimerRef.current);
        dbPersistTimerRef.current = null;
      }
      const merged = { ...pendingDbUpdatesRef.current, ...updates };
      pendingDbUpdatesRef.current = {};
      // Use timeout to prevent hanging when offline
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        supabase
          .from('broadcast_sessions')
          .update(merged as any)
          .eq('sala_code', salaCode)
          .abortSignal(controller.signal)
          .then(({ error }) => {
            clearTimeout(timeout);
            if (error) console.warn('[Broadcast] DB persist failed (offline?):', error.message);
          });
      } catch {
        // Silently ignore — local state + BroadcastChannel already applied
      }
    }

    return true;
  }, [salaCode, broadcastSend, flushDbUpdates]);

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
      is_broadcasting: true,
      songbook_mode: false,
      songbook_file_id: null,
      dual_broadcast: false,
    } as any);
  }, [updateSession]);

  // Dual broadcast: catalog text on /trasmetti + .cho on /partiture
  const broadcastDual = useCallback(async (catalogSongId: string, songbookFileId: string) => {
    return updateSession({
      current_song_id: catalogSongId,
      current_reservation_id: null,
      songbook_file_id: songbookFileId,
      songbook_mode: true,
      dual_broadcast: true,
      display_mode: 'lyrics',
      scroll_position: 0,
      highlight_line: 0,
      is_active: true,
      is_broadcasting: true,
      broadcast_to_tv: true,
      broadcast_to_partiture: true,
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
      is_broadcasting: false,
      songbook_mode: false,
      songbook_file_id: null,
      dual_broadcast: false,
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
    broadcastDual,
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
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const { data, error } = await supabase
        .from('broadcast_setlists')
        .select('*')
        .order('updated_at', { ascending: false })
        .abortSignal(controller.signal);
      clearTimeout(timeout);

      if (error) {
        console.error('Error fetching setlists:', error);
      }
      setSetlists((data || []) as BroadcastSetlist[]);
    } catch {
      console.warn('[useBroadcastSetlists] Network timeout, keeping current data');
    }
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
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const { data, error } = await supabase
        .from('broadcast_setlist_songs')
        .select(`
          *,
          song:songs(id, titolo, artista, testo)
        `)
        .eq('setlist_id', setlistId)
        .order('position', { ascending: true })
        .abortSignal(controller.signal);
      clearTimeout(timeout);

      if (error) {
        console.error('Error fetching setlist songs:', error);
      }
      setSongs((data || []) as BroadcastSetlistSong[]);
    } catch {
      console.warn('[useBroadcastSetlistSongs] Network timeout, keeping current data');
    }
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
