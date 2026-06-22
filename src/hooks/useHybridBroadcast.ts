/**
 * Hybrid Broadcast Hook
 * 
 * Merges Cloud (Supabase Realtime) and Local (WebSocket LAN) broadcast state.
 * - Cloud mode: standard Supabase sync (default)
 * - Local mode: WebSocket sync via local-server for instant LAN performance
 * 
 * The hook provides a unified `session` and `syncUpdate` that automatically
 * routes to the correct transport based on the current connection mode.
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useBroadcast, type BroadcastSession } from '@/hooks/useBroadcast';
import { useConnectionMode, useLocalBroadcast } from '@/hooks/useLocalBroadcast';

// Default session for instant local mode bootstrapping (no cloud wait)
const LOCAL_DEFAULT_SESSION: BroadcastSession = {
  id: 'offline',
  sala_code: 'main',
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
  highlight_style: 'gradient' as const,
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
  created_at: '',
  updated_at: '',
} as BroadcastSession;

export function useHybridBroadcast(salaCode: string = 'main') {
  const cloud = useBroadcast(salaCode);
  const { mode, setMode, localIP, setLocalIP, serverUrl } = useConnectionMode();
  const isLocalMode = mode === 'local';

  // Local overrides: partial state received from WebSocket
  const [localOverrides, setLocalOverrides] = useState<Record<string, unknown>>({});

  const { connected: localConnected, latency: localLatency, sendUpdate: localSendUpdate, cacheSong: localCacheSong, requestSong: localRequestSong } = useLocalBroadcast({
    enabled: isLocalMode,
    serverUrl,
    // Only apply INCREMENTAL updates as overrides (peer sends via WS)
    onStateUpdate: useCallback((state: Record<string, unknown>) => {
      setLocalOverrides(prev => ({ ...prev, ...state }));
    }, []),
    // Initial state from WS: apply ONLY when cloud session is the offline default.
    // When cloud is available, cloud session is the source of truth and WS initial state is ignored.
    // When offline, the WS server holds the real state (set by Admin) and we MUST use it.
    onInitialState: useCallback((state: Record<string, unknown>) => {
      const isOfflineSession = cloud.session?.id === 'offline' || !cloud.session;
      if (isOfflineSession) {
        console.log('[HybridBroadcast] WS initial state applied (offline mode)');
        setLocalOverrides(prev => ({ ...prev, ...state }));
      } else {
        console.log('[HybridBroadcast] WS initial state received (not applied, cloud active)');
      }
    }, [cloud.session?.id]),
  });

  // Clear local overrides when switching to cloud mode
  useEffect(() => {
    if (!isLocalMode) {
      setLocalOverrides({});
    }
  }, [isLocalMode]);

  // Merged session: cloud base + local overrides when in local mode
  // CRITICAL FIX: When cloud.session is null (still loading/timed out) but we're in local mode,
  // use a default session as base so WS overrides are not lost during the cloud timeout gap
  const session: BroadcastSession | null = useMemo(() => {
    if (isLocalMode) {
      const base = cloud.session || LOCAL_DEFAULT_SESSION;
      return { ...base, ...localOverrides } as BroadcastSession;
    }
    return cloud.session;
  }, [isLocalMode, cloud.session, localOverrides]);

  // Stable ref for cloud.updateSession to avoid re-creating syncUpdate on every render
  const cloudUpdateRef = useRef(cloud.updateSession);
  useEffect(() => { cloudUpdateRef.current = cloud.updateSession; }, [cloud.updateSession]);

  // Unified update: sends to local WS or cloud (with instant broadcast) based on mode
  const syncUpdate = useCallback((updates: Record<string, unknown>) => {
    if (isLocalMode) {
      localSendUpdate(updates);
      // Also apply locally immediately for responsive UI
      setLocalOverrides(prev => ({ ...prev, ...updates }));
    } else {
      // cloud.updateSession now handles: local apply + broadcast + DB persist
      cloudUpdateRef.current(updates as any);
    }
  }, [isLocalMode, localSendUpdate]);

  // Local-aware broadcastSong: in local mode, WS è la via primaria;
  // il cloud viene chiamato in background (fire-and-forget) per non bloccare l'UI
  // se il router LAN non ha internet o la rete è lenta.
  const broadcastSong = useCallback(async (songId: string, reservationId?: string) => {
    const updates = {
      current_song_id: songId,
      current_reservation_id: reservationId || null,
      display_mode: 'lyrics',
      scroll_position: 0,
      highlight_line: 0,
      is_active: true,
      is_broadcasting: true,
      songbook_mode: false,
      songbook_file_id: null,
    };
    if (isLocalMode) {
      localSendUpdate(updates);
      setLocalOverrides(prev => ({ ...prev, ...updates }));
      // Cloud in background, non bloccante
      void cloud.broadcastSong(songId, reservationId);
      return true;
    }
    return cloud.broadcastSong(songId, reservationId);
  }, [isLocalMode, localSendUpdate, cloud.broadcastSong]);

  // Local-aware broadcastDual: catalog text on TV, .cho on partiture
  const broadcastDual = useCallback(async (catalogSongId: string, songbookFileId: string) => {
    const updates = {
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
    };
    if (isLocalMode) {
      localSendUpdate(updates);
      setLocalOverrides(prev => ({ ...prev, ...updates }));
      void cloud.broadcastDual(catalogSongId, songbookFileId);
      return true;
    }
    return cloud.broadcastDual(catalogSongId, songbookFileId);
  }, [isLocalMode, localSendUpdate, cloud.broadcastDual]);

  // Local-aware stopBroadcast
  const stopBroadcast = useCallback(async () => {
    const updates = {
      current_song_id: null,
      current_reservation_id: null,
      display_mode: 'waiting',
      scroll_position: 0,
      highlight_line: 0,
      is_broadcasting: false,
      songbook_mode: false,
      songbook_file_id: null,
      dual_broadcast: false,
    };
    if (isLocalMode) {
      localSendUpdate(updates);
      setLocalOverrides(prev => ({ ...prev, ...updates }));
      void cloud.stopBroadcast();
      return true;
    }
    return cloud.stopBroadcast();
  }, [isLocalMode, localSendUpdate, cloud.stopBroadcast]);

  return {
    session,
    loading: cloud.loading,
    syncUpdate,
    updateSession: cloud.updateSession,
    broadcastSong,
    broadcastDual,
    stopBroadcast,
    toggleActive: cloud.toggleActive,
    refetch: cloud.refetch,
    // Connection state
    mode,
    setMode,
    localIP,
    setLocalIP,
    isLocalMode,
    localConnected,
    localLatency,
    localCacheSong,
    localRequestSong,
  };
}
