/**
 * Local WebSocket connection hook for offline broadcast sync.
 * Mirrors the Supabase Realtime behavior but over local WiFi.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';

export type ConnectionMode = 'cloud' | 'local';

interface LocalBroadcastState {
  [key: string]: unknown;
}

interface UseLocalBroadcastOptions {
  enabled: boolean;
  serverUrl: string; // e.g. "ws://192.168.1.100:3456"
  onStateUpdate?: (state: LocalBroadcastState) => void;
}

const STORAGE_KEY_MODE = 'broadcast_connection_mode';
const STORAGE_KEY_IP = 'broadcast_local_ip';
const RECONNECT_INTERVAL = 3000;

export function useConnectionMode() {
  const [mode, setModeState] = useState<ConnectionMode>(() => {
    return (safeGetItem('local', STORAGE_KEY_MODE) as ConnectionMode) || 'cloud';
  });
  const [localIP, setLocalIPState] = useState(() => {
    return safeGetItem('local', STORAGE_KEY_IP) || '192.168.1.100';
  });

  const setMode = useCallback((m: ConnectionMode) => {
    setModeState(m);
    safeSetItem('local', STORAGE_KEY_MODE, m);
  }, []);

  const setLocalIP = useCallback((ip: string) => {
    setLocalIPState(ip);
    safeSetItem('local', STORAGE_KEY_IP, ip);
  }, []);

  const serverUrl = `ws://${localIP}:3456`;

  return { mode, setMode, localIP, setLocalIP, serverUrl };
}

export function useLocalBroadcast({ enabled, serverUrl, onStateUpdate }: UseLocalBroadcastOptions) {
  const [connected, setConnected] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onStateUpdateRef = useRef(onStateUpdate);
  onStateUpdateRef.current = onStateUpdate;

  const connect = useCallback(() => {
    if (!enabled) return;

    // Cannot use ws:// from an HTTPS page — skip silently
    if (window.location.protocol === 'https:' && serverUrl.startsWith('ws://')) {
      console.warn('[LocalBroadcast] Impossibile usare ws:// da pagina HTTPS. Usa l\'app da http:// locale.');
      setConnected(false);
      return;
    }

    try {
      const ws = new WebSocket(serverUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        console.log('[LocalBroadcast] Connesso a', serverUrl);
        ws.send(JSON.stringify({ type: 'ping' }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'state':
            case 'update':
              onStateUpdateRef.current?.(msg.data);
              break;
            case 'pong':
              if (msg.timestamp) {
                setLatency(Date.now() - msg.timestamp);
              }
              break;
            case 'song_data':
              break;
          }
        } catch (e) {
          console.error('[LocalBroadcast] Parse error:', e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        if (enabled) {
          reconnectRef.current = setTimeout(connect, RECONNECT_INTERVAL);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.error('[LocalBroadcast] Connection failed:', e);
      if (enabled) {
        reconnectRef.current = setTimeout(connect, RECONNECT_INTERVAL);
      }
    }
  }, [enabled, serverUrl]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      wsRef.current?.close();
      wsRef.current = null;
      setConnected(false);
    }

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [enabled, connect]);

  const sendUpdate = useCallback((data: Partial<LocalBroadcastState>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'update', data }));
    }
  }, []);

  const cacheSong = useCallback((song: { id: string; title: string; artist: string | null; content: string }) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cache_song', data: song }));
    }
  }, []);

  return {
    connected,
    latency,
    sendUpdate,
    cacheSong,
  };
}
