import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface LeaderboardEntry {
  id: string;
  participant_name: string;
  total_songs: number;
  total_dedications: number;
  total_points: number;
  current_streak: number;
  max_streak: number;
  badges_count: number;
  last_participation_date: string | null;
}

interface Badge {
  id: string;
  badge_key: string;
  badge_name: string;
  badge_description: string | null;
  badge_icon: string;
  earned_at: string;
}

interface UserStats {
  stats: LeaderboardEntry | null;
  badges: Badge[];
  rank: number | null;
}

export const useLeaderboard = (limit = 10) => {
  return useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const { data, error } = await supabase
        .from('leaderboard_stats')
        .select('*')
        .order('total_points', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    staleTime: 30000, // 30 secondi
  });
};

export const useUserStats = (participantName: string | null) => {
  return useQuery({
    queryKey: ['user-stats', participantName],
    queryFn: async (): Promise<UserStats> => {
      if (!participantName) {
        return { stats: null, badges: [], rank: null };
      }

      // Fetch user stats
      const { data: stats, error: statsError } = await supabase
        .from('leaderboard_stats')
        .select('*')
        .eq('participant_name', participantName)
        .maybeSingle();

      if (statsError) throw statsError;

      // Fetch user badges
      const { data: badges, error: badgesError } = await supabase
        .from('user_badges')
        .select('*')
        .eq('participant_name', participantName)
        .order('earned_at', { ascending: false });

      if (badgesError) throw badgesError;

      // Calculate rank
      let rank: number | null = null;
      if (stats) {
        const { count, error: rankError } = await supabase
          .from('leaderboard_stats')
          .select('*', { count: 'exact', head: true })
          .gt('total_points', stats.total_points);

        if (!rankError && count !== null) {
          rank = count + 1;
        }
      }

      return { stats, badges: badges || [], rank };
    },
    enabled: !!participantName,
    staleTime: 30000,
  });
};

export const useRealtimeLeaderboard = (limit = 10) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    // Initial fetch
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from('leaderboard_stats')
        .select('*')
        .order('total_points', { ascending: false })
        .limit(limit);
      
      if (data) setLeaderboard(data);
    };

    fetchLeaderboard();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leaderboard_stats',
        },
        () => {
          // Refetch on any change
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  return leaderboard;
};

export const useRecentBadges = (limit = 5) => {
  return useQuery({
    queryKey: ['recent-badges', limit],
    queryFn: async (): Promise<(Badge & { participant_name: string })[]> => {
      const { data, error } = await supabase
        .from('user_badges')
        .select('*')
        .order('earned_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });
};
