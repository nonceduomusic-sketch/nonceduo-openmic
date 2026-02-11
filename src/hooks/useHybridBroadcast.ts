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
    onStateUpdate: useCallback((state: Record<string, unknown>) => {
      setLocalOverrides(prev => ({ ...prev, ...state }));
    }, []),
  });

  // Merged session: cloud base + local overrides when in local mode
  const session: BroadcastSession | null = cloud.session
    ? isLocalMode
      ? { ...cloud.session, ...localOverrides } as BroadcastSession
      : cloud.session
    : isLocalMode && Object.keys(localOverrides).length > 0
      ? localOverrides as unknown as BroadcastSession
      : null;

  // Unified update: sends to local WS or cloud DB based on mode
  const syncUpdate = useCallback((updates: Record<string, unknown>) => {
    if (isLocalMode) {
      localSendUpdate(updates);
      // Also apply locally immediately for responsive UI
      setLocalOverrides(prev => ({ ...prev, ...updates }));
    } else {
      cloud.updateSession(updates as any);
    }
  }, [isLocalMode, localSendUpdate, cloud.updateSession]);

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
