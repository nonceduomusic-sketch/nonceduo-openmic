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
import { useState, useCallback, useEffect, useRef } from 'react';
import { useBroadcast, type BroadcastSession } from '@/hooks/useBroadcast';
import { useConnectionMode, useLocalBroadcast } from '@/hooks/useLocalBroadcast';

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
  const session: BroadcastSession | null = cloud.session
    ? isLocalMode
      ? { ...cloud.session, ...localOverrides } as BroadcastSession
      : cloud.session
    : null;

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

  // Local-aware broadcastSong: in local mode, also push via WS so LAN devices update
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
    }
    // Always call cloud too (for DB persistence when online, local state always)
    return cloud.broadcastSong(songId, reservationId);
  }, [isLocalMode, localSendUpdate, cloud.broadcastSong]);

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
    };
    if (isLocalMode) {
      localSendUpdate(updates);
      setLocalOverrides(prev => ({ ...prev, ...updates }));
    }
    return cloud.stopBroadcast();
  }, [isLocalMode, localSendUpdate, cloud.stopBroadcast]);

  return {
    session,
    loading: cloud.loading,
    syncUpdate,
    updateSession: cloud.updateSession,
    broadcastSong,
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
