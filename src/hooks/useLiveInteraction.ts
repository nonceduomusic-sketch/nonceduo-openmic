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

type VoteType = 'up' | 'fire' | 'heart';

/**
 * Hook per gestire i voti alle performance
 * Supporta: votazione singola per utente, cambio voto, evidenziazione scelta
 */
export const usePerformanceVotes = (reservationId?: string) => {
  const [voteCounts, setVoteCounts] = useState<VoteCount | null>(null);
  const [userVoteType, setUserVoteType] = useState<VoteType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getFingerprint = useCallback(() => {
    let fp = localStorage.getItem('session_fingerprint');
    if (!fp) {
      fp = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('session_fingerprint', fp);
    }
    return fp;
  }, []);

  // Fetch initial vote count and user's existing vote
  useEffect(() => {
    if (!reservationId) return;

    const fetchVotes = async () => {
      const fingerprint = getFingerprint();
      
      // Fetch vote counts
      const { data: counts } = await supabase
        .from('performance_vote_counts')
        .select('*')
        .eq('reservation_id', reservationId)
        .maybeSingle();
      
      if (counts) setVoteCounts(counts);

      // Check user's existing vote
      const { data: existingVote } = await supabase
        .from('performance_votes')
        .select('vote_type')
        .eq('reservation_id', reservationId)
        .eq('voter_fingerprint', fingerprint)
        .maybeSingle();
      
      if (existingVote) {
        setUserVoteType(existingVote.vote_type as VoteType);
      }
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
  }, [reservationId, getFingerprint]);

  const vote = useCallback(async (voteType: VoteType) => {
    if (!reservationId || isLoading) return false;
    
    // If clicking the same vote type, do nothing (can't remove vote)
    if (userVoteType === voteType) return false;

    setIsLoading(true);
    const fingerprint = getFingerprint();

    try {
      if (userVoteType) {
        // User is changing their vote - UPDATE
        const { error } = await supabase
          .from('performance_votes')
          .update({ vote_type: voteType })
          .eq('reservation_id', reservationId)
          .eq('voter_fingerprint', fingerprint);

        if (!error) {
          setUserVoteType(voteType);
          setIsLoading(false);
          return true;
        }
      } else {
        // First vote - INSERT (use upsert to handle race conditions)
        const { error } = await supabase
          .from('performance_votes')
          .upsert({
            reservation_id: reservationId,
            voter_fingerprint: fingerprint,
            vote_type: voteType,
          }, {
            onConflict: 'reservation_id,voter_fingerprint'
          });

        if (!error) {
          setUserVoteType(voteType);
          setIsLoading(false);
          return true;
        }
      }
    } catch (e) {
      console.error('Vote error:', e);
    }
    
    setIsLoading(false);
    return false;
  }, [reservationId, userVoteType, isLoading, getFingerprint]);

  return { 
    voteCounts, 
    userVoteType, 
    hasVoted: userVoteType !== null, 
    vote, 
    isLoading 
  };
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
