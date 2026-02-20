/**
 * Local WebSocket connection hook for offline broadcast sync.
 * Mirrors the Supabase Realtime behavior but over local WiFi.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';

export type ConnectionMode = 'cloud' | 'local';

interface LocalBroadcastState {
  [key: string]: unknown;
}

interface UseLocalBroadcastOptions {
  enabled: boolean;
  serverUrl: string; // e.g. "ws://192.168.1.100:3456"
  /** Called ONLY for incremental 'update' messages from peers */
  onStateUpdate?: (state: LocalBroadcastState) => void;
  /** Called once when the WS connects and sends the full initial state.
   *  Consumers should NOT blindly merge this into overrides. */
  onInitialState?: (state: LocalBroadcastState) => void;
}

const STORAGE_KEY_MODE = 'broadcast_connection_mode';
const STORAGE_KEY_IP = 'broadcast_local_ip';
const RECONNECT_INTERVAL = 3000;

/**
 * Detect if we're running on the local mini-server (HTTP + LAN IP or localhost).
 * When detected, auto-switch to local mode using the server's hostname.
 */
function detectLocalServer(): { isLocal: boolean; detectedIP: string } {
  try {
    const proto = window.location.protocol;
    const host = window.location.hostname;
    // Running on HTTP (not HTTPS) and on localhost or a LAN IP → local server
    if (proto === 'http:') {
      if (host === 'localhost' || host === '127.0.0.1') {
        return { isLocal: true, detectedIP: '127.0.0.1' };
      }
      // LAN IPs: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
      if (/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
        return { isLocal: true, detectedIP: host };
      }
    }
  } catch {
    // ignore
  }
  return { isLocal: false, detectedIP: '' };
}

export function useConnectionMode() {
  const localServer = useMemo(() => detectLocalServer(), []);

  const [mode, setModeState] = useState<ConnectionMode>(() => {
    // Auto-detect: if served from local server, default to 'local'
    if (localServer.isLocal) return 'local';
    return (safeGetItem('local', STORAGE_KEY_MODE) as ConnectionMode) || 'cloud';
  });
  const [localIP, setLocalIPState] = useState(() => {
    // Auto-detect: use the server's hostname as the local IP
    if (localServer.isLocal && localServer.detectedIP) return localServer.detectedIP;
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

  return { mode, setMode, localIP, setLocalIP, serverUrl, isLocalServer: localServer.isLocal };
}

export function useLocalBroadcast({ enabled, serverUrl, onStateUpdate, onInitialState }: UseLocalBroadcastOptions) {
  const [connected, setConnected] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onStateUpdateRef = useRef(onStateUpdate);
  const onInitialStateRef = useRef(onInitialState);
  onStateUpdateRef.current = onStateUpdate;
  onInitialStateRef.current = onInitialState;

  // Song request promise resolvers keyed by song id
  const songResolversRef = useRef<Map<string, (song: any) => void>>(new Map());

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
              // Initial full state — call separate handler (do NOT merge as overrides)
              onInitialStateRef.current?.(msg.data);
              break;
            case 'update':
              // Incremental update from a peer — safe to merge as override
              onStateUpdateRef.current?.(msg.data);
              break;
            case 'pong':
              if (msg.timestamp) {
                setLatency(Date.now() - msg.timestamp);
              }
              break;
            case 'song_data': {
              const resolver = songResolversRef.current.get(msg.id);
              if (resolver) {
                resolver(msg.data || null);
                songResolversRef.current.delete(msg.id);
              }
              break;
            }
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

  /** Request a cached song from the local WS server. Returns null if not found or timeout. */
  const requestSong = useCallback((songId: string, timeoutMs = 2000): Promise<{ title: string; artist: string | null; content: string } | null> => {
    return new Promise((resolve) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        resolve(null);
        return;
      }
      const timer = setTimeout(() => {
        songResolversRef.current.delete(songId);
        resolve(null);
      }, timeoutMs);
      songResolversRef.current.set(songId, (data) => {
        clearTimeout(timer);
        resolve(data ? { title: data.title || '', artist: data.artist || null, content: data.content } : null);
      });
      wsRef.current.send(JSON.stringify({ type: 'get_song', id: songId }));
    });
  }, []);

  return {
    connected,
    latency,
    sendUpdate,
    cacheSong,
    requestSong,
  };
}
