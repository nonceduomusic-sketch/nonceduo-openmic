import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook per gestire le reazioni emoji live
 */
export const useLiveReactions = () => {
  const [recentEmojis, setRecentEmojis] = useState<{ emoji: string; id: string }[]>([]);

  // Listen to realtime reactions
  useEffect(() => {
    const channel = supabase
      .channel('live-reactions-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_reactions',
        },
        (payload) => {
          const { emoji, id } = payload.new as { emoji: string; id: string };
          setRecentEmojis((prev) => [...prev.slice(-20), { emoji, id }]);
          
          // Auto-remove after animation
          setTimeout(() => {
            setRecentEmojis((prev) => prev.filter((e) => e.id !== id));
          }, 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sendReaction = useCallback(async (emoji: string) => {
    const fingerprint = localStorage.getItem('session_fingerprint') || 
      `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (!localStorage.getItem('session_fingerprint')) {
      localStorage.setItem('session_fingerprint', fingerprint);
    }

    await supabase.from('live_reactions').insert({
      emoji,
      session_fingerprint: fingerprint,
    });
  }, []);

  return { recentEmojis, sendReaction };
};

interface VoteCount {
  reservation_id: string;
  total_votes: number;
  fire_votes: number;
  heart_votes: number;
}

/**
 * Hook per gestire i voti alle performance
 */
export const usePerformanceVotes = (reservationId?: string) => {
  const [voteCounts, setVoteCounts] = useState<VoteCount | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  const fingerprint = typeof window !== 'undefined' 
    ? localStorage.getItem('session_fingerprint') || `anon_${Date.now()}`
    : '';

  // Fetch initial vote count
  useEffect(() => {
    if (!reservationId) return;

    const fetchVotes = async () => {
      const { data } = await supabase
        .from('performance_vote_counts')
        .select('*')
        .eq('reservation_id', reservationId)
        .maybeSingle();
      
      if (data) setVoteCounts(data);

      // Check if user already voted
      const { data: existingVote } = await supabase
        .from('performance_votes')
        .select('id')
        .eq('reservation_id', reservationId)
        .eq('voter_fingerprint', fingerprint)
        .maybeSingle();
      
      setHasVoted(!!existingVote);
    };

    fetchVotes();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`votes-${reservationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'performance_vote_counts',
          filter: `reservation_id=eq.${reservationId}`,
        },
        (payload) => {
          if (payload.new) {
            setVoteCounts(payload.new as VoteCount);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reservationId, fingerprint]);

  const vote = useCallback(async (voteType: 'up' | 'fire' | 'heart') => {
    if (!reservationId || hasVoted) return false;

    const fp = localStorage.getItem('session_fingerprint') || 
      `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (!localStorage.getItem('session_fingerprint')) {
      localStorage.setItem('session_fingerprint', fp);
    }

    const { error } = await supabase.from('performance_votes').insert({
      reservation_id: reservationId,
      voter_fingerprint: fp,
      vote_type: voteType,
    });

    if (!error) {
      setHasVoted(true);
      return true;
    }
    return false;
  }, [reservationId, hasVoted]);

  return { voteCounts, hasVoted, vote };
};

/**
 * Hook per la classifica delle performance (Top Votes)
 */
export const useTopPerformances = (limit = 5) => {
  const [performances, setPerformances] = useState<(VoteCount & { 
    song_title: string; 
    song_artist: string; 
    customer_name: string 
  })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTop = async () => {
      setLoading(true);
      const { data: votes } = await supabase
        .from('performance_vote_counts')
        .select(`
          *,
          reservations!inner(song_title, song_artist, customer_name)
        `)
        .order('total_votes', { ascending: false })
        .limit(limit);

      if (votes) {
        setPerformances(votes.map((v: any) => ({
          ...v,
          song_title: v.reservations.song_title,
          song_artist: v.reservations.song_artist,
          customer_name: v.reservations.customer_name,
        })));
      }
      setLoading(false);
    };

    fetchTop();

    // Subscribe to updates
    const channel = supabase
      .channel('top-performances')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'performance_vote_counts',
        },
        () => {
          fetchTop();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  return { topPerformances: performances, loading };
};
