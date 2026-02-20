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

  const { connected: localConnected, latency: localLatency, sendUpdate: localSendUpdate, cacheSong: localCacheSong } = useLocalBroadcast({
    enabled: isLocalMode,
    serverUrl,
    // Only apply INCREMENTAL updates as overrides (peer sends via WS)
    onStateUpdate: useCallback((state: Record<string, unknown>) => {
      setLocalOverrides(prev => ({ ...prev, ...state }));
    }, []),
    // Initial state from WS: do NOT merge — cloud session is the source of truth.
    // We only track it so we know the WS is alive; cloud.session is always the base.
    onInitialState: useCallback((_state: Record<string, unknown>) => {
      // Intentionally ignored: cloud session already has the correct values.
      // localOverrides should only contain fields explicitly pushed by a peer.
      console.log('[HybridBroadcast] WS initial state received (not applied as override)');
    }, []),
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

  return {
    session,
    loading: cloud.loading,
    syncUpdate,
    // Cloud-only operations (bookings, songs, etc. still go through cloud)
    updateSession: cloud.updateSession,
    broadcastSong: cloud.broadcastSong,
    stopBroadcast: cloud.stopBroadcast,
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
  };
}
