/**
 * Supabase Broadcast Channel for near-instant sync.
 * 
 * Uses Supabase Realtime Broadcast (peer-to-peer through the Realtime server)
 * instead of postgres_changes (which goes through the database WAL).
 * 
 * Latency: ~20ms vs 100-500ms for postgres_changes.
 * 
 * OFFLINE FALLBACK: Also uses the browser-native BroadcastChannel API
 * for same-browser sync when Supabase Realtime is unavailable (offline).
 * This ensures that multiple tabs/components on the same device stay in sync.
 * 
 * The DB is still updated in the background for persistence,
 * but UI updates happen instantly via this channel.
 */
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

type BroadcastPayload = Record<string, unknown>;

interface UseBroadcastChannelOptions {
  salaCode: string;
  /** Called when a peer sends an update via broadcast */
  onUpdate: (payload: BroadcastPayload) => void;
}

/**
 * Hook that subscribes to a Supabase Broadcast channel for instant sync.
 * Also uses the browser-native BroadcastChannel for offline same-browser sync.
 * Returns a `send` function to broadcast updates to all peers.
 */
export function useBroadcastChannel({ salaCode, onUpdate }: UseBroadcastChannelOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const nativeChannelRef = useRef<BroadcastChannel | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    // 1. Supabase Realtime channel (works online)
    const channel = supabase
      .channel(`broadcast-sync-${salaCode}`, {
        config: { broadcast: { self: false } },
      })
      .on('broadcast', { event: 'sync' }, (payload) => {
        if (payload.payload) {
          onUpdateRef.current(payload.payload as BroadcastPayload);
        }
      })
      .subscribe();

    channelRef.current = channel;

    // 2. Browser-native BroadcastChannel (works offline, same browser)
    let nativeChannel: BroadcastChannel | null = null;
    try {
      nativeChannel = new BroadcastChannel(`broadcast-native-${salaCode}`);
      nativeChannel.onmessage = (event) => {
        if (event.data) {
          onUpdateRef.current(event.data as BroadcastPayload);
        }
      };
      nativeChannelRef.current = nativeChannel;
    } catch {
      // BroadcastChannel not supported (rare)
    }

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      nativeChannel?.close();
      nativeChannelRef.current = null;
    };
  }, [salaCode]);

  const send = useCallback((data: BroadcastPayload) => {
    // Send via Supabase Realtime (cross-device, online)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'sync',
      payload: data,
    });
    // Also send via native BroadcastChannel (same-browser, works offline)
    try {
      nativeChannelRef.current?.postMessage(data);
    } catch {
      // ignore
    }
  }, []);

  return { send };
}
