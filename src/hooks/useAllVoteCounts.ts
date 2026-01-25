import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VoteCount {
  reservation_id: string;
  total_votes: number;
  fire_votes: number;
  heart_votes: number;
}

/**
 * Hook per recuperare tutti i conteggi dei voti per l'admin
 * Restituisce una mappa reservation_id -> voti
 */
export const useAllVoteCounts = () => {
  const [votesMap, setVotesMap] = useState<Map<string, VoteCount>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllVotes = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('performance_vote_counts')
        .select('*');

      if (data) {
        const map = new Map<string, VoteCount>();
        data.forEach((vote) => {
          map.set(vote.reservation_id, vote);
        });
        setVotesMap(map);
      }
      setLoading(false);
    };

    fetchAllVotes();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`all-votes-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'performance_vote_counts',
        },
        () => {
          // Refetch on any change
          fetchAllVotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getVotesForReservation = (reservationId: string): VoteCount | null => {
    return votesMap.get(reservationId) || null;
  };

  return { votesMap, getVotesForReservation, loading };
};
