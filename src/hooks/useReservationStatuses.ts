import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReservationStatus {
  id: string;
  reservation_id: string;
  song_title: string;
  song_artist: string;
  song_key: string;
  status: 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

/**
 * Hook to get real-time reservation statuses (public, no PII).
 * Used by OpenMic page to show which songs are booked/completed
 * without exposing customer names.
 */
export const useReservationStatuses = () => {
  const [statuses, setStatuses] = useState<ReservationStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatuses = useCallback(async () => {
    const { data, error } = await supabase
      .from('reservation_statuses')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching reservation statuses:', error);
      }
      setLoading(false);
      return;
    }

    setStatuses(data as ReservationStatus[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatuses();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('reservation-statuses-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservation_statuses',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newStatus = payload.new as ReservationStatus;
            setStatuses((prev) => [...prev, newStatus]);
          } else if (payload.eventType === 'UPDATE') {
            setStatuses((prev) =>
              prev.map((s) =>
                s.id === payload.new.id ? (payload.new as ReservationStatus) : s
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setStatuses((prev) =>
              prev.filter((s) => s.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStatuses]);

  // Normalize text for matching (same logic as DB)
  const normalizeText = useCallback((text: string) => {
    return text.replace(/[''`´]/g, "'").toLowerCase().trim();
  }, []);

  const getSongKey = useCallback((title: string, artist: string) => {
    return `${normalizeText(title)}__${normalizeText(artist)}`;
  }, [normalizeText]);

  // Create lookup sets
  const bookedSongKeys = useMemo(() => {
    const set = new Set<string>();
    statuses.forEach((s) => {
      if (s.status === 'in_progress') {
        set.add(s.song_key);
      }
    });
    return set;
  }, [statuses]);

  const completedSongKeys = useMemo(() => {
    const set = new Set<string>();
    statuses.forEach((s) => {
      if (s.status === 'completed') {
        set.add(s.song_key);
      }
    });
    return set;
  }, [statuses]);

  const isSongBooked = useCallback(
    (title: string, artist: string) => {
      const key = getSongKey(title, artist);
      return bookedSongKeys.has(key);
    },
    [getSongKey, bookedSongKeys]
  );

  const isSongCompleted = useCallback(
    (title: string, artist: string) => {
      const key = getSongKey(title, artist);
      // Completed only if not also booked
      return completedSongKeys.has(key) && !bookedSongKeys.has(key);
    },
    [getSongKey, completedSongKeys, bookedSongKeys]
  );

  const activeCount = useMemo(
    () => statuses.filter((s) => s.status === 'in_progress').length,
    [statuses]
  );

  return {
    statuses,
    loading,
    isSongBooked,
    isSongCompleted,
    activeCount,
    getSongKey,
    bookedSongKeys,
    completedSongKeys,
  };
};
