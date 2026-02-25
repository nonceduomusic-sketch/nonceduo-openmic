import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';

export interface FuroreSession {
  id: string;
  status: 'closed' | 'open' | 'locked';
  max_players: number;
  show_order_to_players: boolean;
  show_player_count: boolean;
  show_bookings_to_players: boolean;
  sound_key: string;
  created_at: string;
  updated_at: string;
}

export interface FurorePlayer {
  id: string;
  session_id: string;
  nickname: string;
  symbol: string;
  photo_url: string | null;
  color: string;
  device_fingerprint: string | null;
  created_at: string;
}

export interface FuroreBooking {
  id: string;
  session_id: string;
  player_id: string;
  position: number;
  created_at: string;
}

// ─── Active Session Hook (realtime) ───
export const useFuroreSession = () => {
  const [session, setSession] = useState<FuroreSession | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    // Get the most recent session
    const { data, error } = await supabase
      .from('furore_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setSession(data as unknown as FuroreSession);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSession();

    const channel = supabase
      .channel(`furore-session-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'furore_sessions' }, () => {
        fetchSession();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchSession]);

  return { session, loading, refetch: fetchSession };
};

// ─── Players Hook (realtime) ───
export const useFurorePlayers = (sessionId: string | undefined) => {
  const [players, setPlayers] = useState<FurorePlayer[]>([]);

  const fetchPlayers = useCallback(async () => {
    if (!sessionId) { setPlayers([]); return; }
    const { data } = await supabase
      .from('furore_players')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (data) setPlayers(data as unknown as FurorePlayer[]);
  }, [sessionId]);

  useEffect(() => {
    fetchPlayers();
    if (!sessionId) return;

    const channel = supabase
      .channel(`furore-players-${sessionId}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'furore_players', filter: `session_id=eq.${sessionId}` }, () => {
        fetchPlayers();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, fetchPlayers]);

  return { players, refetch: fetchPlayers };
};

// ─── Bookings Hook (realtime) ───
export const useFuroreBookings = (sessionId: string | undefined) => {
  const [bookings, setBookings] = useState<FuroreBooking[]>([]);

  const fetchBookings = useCallback(async () => {
    if (!sessionId) { setBookings([]); return; }
    const { data } = await supabase
      .from('furore_bookings')
      .select('*')
      .eq('session_id', sessionId)
      .order('position', { ascending: true });
    if (data) setBookings(data as unknown as FuroreBooking[]);
  }, [sessionId]);

  useEffect(() => {
    fetchBookings();
    if (!sessionId) return;

    const channel = supabase
      .channel(`furore-bookings-${sessionId}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'furore_bookings', filter: `session_id=eq.${sessionId}` }, () => {
        fetchBookings();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, fetchBookings]);

  return { bookings, refetch: fetchBookings };
};

// ─── Admin Actions ───
export const useFuroreAdmin = () => {
  const createSession = async (): Promise<FuroreSession | null> => {
    const { data, error } = await supabase
      .from('furore_sessions')
      .insert({ status: 'closed' })
      .select()
      .single();
    if (error) { console.error('Error creating session:', error); return null; }
    return data as unknown as FuroreSession;
  };

  const updateSession = async (id: string, updates: Partial<FuroreSession>) => {
    const { error } = await supabase
      .from('furore_sessions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    return !error;
  };

  const openBookings = async (id: string) => updateSession(id, { status: 'open' } as any);
  const closeBookings = async (id: string) => updateSession(id, { status: 'closed' } as any);

  const resetSession = async (id: string) => {
    // Delete all bookings and players
    await supabase.from('furore_bookings').delete().eq('session_id', id);
    await supabase.from('furore_players').delete().eq('session_id', id);
    return updateSession(id, { status: 'closed' } as any);
  };

  const setMaxPlayers = async (id: string, max: number) => updateSession(id, { max_players: max } as any);
  const setShowOrder = async (id: string, show: boolean) => updateSession(id, { show_order_to_players: show } as any);
  const setSoundKey = async (id: string, key: string) => updateSession(id, { sound_key: key } as any);
  const setShowPlayerCount = async (id: string, show: boolean) => updateSession(id, { show_player_count: show } as any);
  const setShowBookings = async (id: string, show: boolean) => updateSession(id, { show_bookings_to_players: show } as any);

  const deletePlayer = async (playerId: string, sessionId: string) => {
    await supabase.from('furore_bookings').delete().eq('player_id', playerId).eq('session_id', sessionId);
    await supabase.from('furore_players').delete().eq('id', playerId);
  };

  const updatePlayer = async (playerId: string, updates: { nickname?: string; symbol?: string; color?: string }) => {
    const { error } = await supabase.from('furore_players').update(updates).eq('id', playerId);
    return !error;
  };

  return { createSession, updateSession, openBookings, closeBookings, resetSession, setMaxPlayers, setShowOrder, setShowPlayerCount, setShowBookings, setSoundKey, deletePlayer, updatePlayer };
};

// ─── Player Actions ───
export const useFurorePlayerActions = () => {
  const joinSession = async (sessionId: string, nickname: string, symbol: string, color: string, photoUrl?: string) => {
    const fingerprint = getDeviceFingerprint();
    const { data, error } = await supabase
      .from('furore_players')
      .insert({
        session_id: sessionId,
        nickname: nickname.trim(),
        symbol,
        color,
        photo_url: photoUrl || null,
        device_fingerprint: fingerprint,
      })
      .select()
      .single();
    if (error) { console.error('Error joining:', error); return null; }
    return data as unknown as FurorePlayer;
  };

  const exitSession = async (playerId: string, sessionId: string) => {
    const fingerprint = localStorage.getItem('furore_device_fp');
    if (!fingerprint) return false;

    const { data, error } = await supabase.rpc('furore_player_exit', {
      p_player_id: playerId,
      p_session_id: sessionId,
      p_device_fingerprint: fingerprint,
    });

    if (error) {
      console.error('Error exiting session:', error);
      return false;
    }

    localStorage.removeItem('furore_device_fp');
    return data === true;
  };

  const pressButton = async (sessionId: string, playerId: string): Promise<number | null> => {
    // Get current max position
    const { data: existing } = await supabase
      .from('furore_bookings')
      .select('position')
      .eq('session_id', sessionId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = (existing?.position ?? 0) + 1;

    const { data, error } = await supabase
      .from('furore_bookings')
      .insert({
        session_id: sessionId,
        player_id: playerId,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) {
      // Duplicate? Player already booked
      if (error.code === '23505') return -1;
      console.error('Error booking:', error);
      return null;
    }
    return (data as any).position;
  };

  return { joinSession, exitSession, pressButton };
};

// ─── Helpers ───
function getDeviceFingerprint(): string {
  const key = 'furore_device_fp';
  let fp = localStorage.getItem(key);
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem(key, fp);
  }
  return fp;
}

// Predefined symbols for player selection
export const FURORE_SYMBOLS = [
  '🎤', '🎸', '🥁', '🎹', '🎺', '🎷', '🎻', '🪗',
  '⚡', '🔥', '💎', '🌟', '🦁', '🐺', '🦅', '🐉',
  '🎯', '🏆', '👑', '🃏', '🎭', '🎪', '🚀', '💫',
];

// Predefined colors
export const FURORE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#FF8C00', '#7B68EE',
  '#FF69B4', '#00CED1', '#32CD32', '#FFD700',
];

// Sound options
export const FURORE_SOUNDS: { key: string; label: string; emoji: string }[] = [
  { key: 'bell1', label: 'Campanella classica', emoji: '🔔' },
  { key: 'bell2', label: 'Ding elegante', emoji: '✨' },
  { key: 'buzzer', label: 'Buzzer quiz', emoji: '🚨' },
  { key: 'horn', label: 'Tromba', emoji: '📯' },
  { key: 'pop', label: 'Pop divertente', emoji: '🎉' },
];
