/**
 * Supabase Broadcast Channel for near-instant sync.
 * 
 * Uses Supabase Realtime Broadcast (peer-to-peer through the Realtime server)
 * instead of postgres_changes (which goes through the database WAL).
 * 
 * Latency: ~20ms vs 100-500ms for postgres_changes.
 * 
 * The DB is still updated in the background for persistence,
 * but UI updates happen instantly via this channel.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
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
 * Returns a `send` function to broadcast updates to all peers.
 */
export function useBroadcastChannel({ salaCode, onUpdate }: UseBroadcastChannelOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
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

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [salaCode]);

  const send = useCallback((data: BroadcastPayload) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'sync',
      payload: data,
    });
  }, []);

  return { send };
}
