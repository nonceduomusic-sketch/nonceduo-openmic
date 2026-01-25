import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LiveNotification {
  id: string;
  type: 'booking' | 'dedication' | 'join' | 'milestone';
  name: string;
  song?: string;
  message?: string;
}

/**
 * Hook per le notifiche live "X ha prenotato Y"
 * Ascolta le nuove prenotazioni in realtime e genera notifiche
 */
export const useLiveNotifications = () => {
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback((notification: Omit<LiveNotification, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setNotifications((prev) => [...prev.slice(-4), { ...notification, id }]);
  }, []);

  useEffect(() => {
    // Subscribe to new reservations
    const channel = supabase
      .channel('live-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reservations',
        },
        (payload) => {
          const { customer_name, song_title, dedication_message } = payload.new as {
            customer_name: string;
            song_title: string;
            dedication_message?: string;
          };

          if (dedication_message) {
            addNotification({
              type: 'dedication',
              name: customer_name,
              song: song_title,
            });
          } else {
            addNotification({
              type: 'booking',
              name: customer_name,
              song: song_title,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addNotification]);

  return {
    notifications,
    dismissNotification,
    addNotification,
  };
};

/**
 * Hook per contare i "viewer" simulati
 * Incrementa/decrementa casualmente per effetto social proof
 */
export const useLiveViewerCount = (baseCount = 0) => {
  const [count, setCount] = useState(baseCount);

  useEffect(() => {
    // Simula fluttuazioni di viewer
    const interval = setInterval(() => {
      setCount((prev) => {
        const change = Math.random() > 0.5 ? 1 : -1;
        const newCount = prev + change;
        // Keep between 0 and baseCount + 30
        return Math.max(0, Math.min(baseCount + 30, newCount));
      });
    }, 5000 + Math.random() * 5000);

    return () => clearInterval(interval);
  }, [baseCount]);

  // Also listen to real activity to boost count
  useEffect(() => {
    const channel = supabase
      .channel('viewer-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reservations',
        },
        () => {
          // Boost count on activity
          setCount((prev) => prev + Math.floor(Math.random() * 3) + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
};

/**
 * Hook per ottenere statistiche aggregate delle serate
 */
export const useEventStats = () => {
  const [stats, setStats] = useState({
    totalEvents: 500,
    totalSongs: 10000,
    totalParticipants: 2500,
    isLoading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Count total reservations
        const { count: songsCount } = await supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true });

        // Count unique participants
        const { data: participants } = await supabase
          .from('leaderboard_stats')
          .select('id', { count: 'exact', head: true });

        setStats({
          totalEvents: 500, // Placeholder - could be tracked in a separate table
          totalSongs: songsCount || 10000,
          totalParticipants: participants?.length || 2500,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error fetching event stats:', error);
        setStats((prev) => ({ ...prev, isLoading: false }));
      }
    };

    fetchStats();
  }, []);

  return stats;
};
