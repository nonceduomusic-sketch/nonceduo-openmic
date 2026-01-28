import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to count active PIN sessions (connected users)
 * Uses realtime subscription to keep the count updated
 */
export const useConnectedUsersCount = (liveSessionId: string | null) => {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fetchCount = useCallback(async () => {
    if (!liveSessionId) {
      setCount(0);
      return;
    }

    setLoading(true);
    try {
      const { count: sessionCount, error } = await supabase
        .from('pin_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('live_session_id', liveSessionId)
        .eq('is_valid', true);

      if (error) {
        console.error('Error fetching connected users count:', error);
        setCount(0);
      } else {
        setCount(sessionCount || 0);
      }
    } catch (err) {
      console.error('Error fetching connected users count:', err);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [liveSessionId]);

  useEffect(() => {
    fetchCount();

    // Subscribe to realtime changes
    if (!liveSessionId) return;

    const channel = supabase
      .channel(`pin-sessions-count-${liveSessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pin_sessions',
          filter: `live_session_id=eq.${liveSessionId}`,
        },
        () => {
          // Refetch count on any change
          fetchCount();
        }
      )
      .subscribe();

    // Also refresh every 30 seconds as backup
    const interval = setInterval(fetchCount, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [liveSessionId, fetchCount]);

  return { count, loading, refresh: fetchCount };
};
