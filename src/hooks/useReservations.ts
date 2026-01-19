import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Reservation {
  id: string;
  customer_name: string;
  song_title: string;
  song_artist: string;
  status: 'in_progress' | 'completed';
  completed_at: string | null;
  created_at: string;
}

export const useReservations = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReservations = useCallback(async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching reservations:', error);
      toast.error('Errore nel caricamento delle prenotazioni');
      return;
    }

    setReservations(data as Reservation[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReservations();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('reservations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newReservation = payload.new as Reservation;
            setReservations((prev) => [...prev, newReservation]);
            // Trigger notification for admin
            window.dispatchEvent(
              new CustomEvent('new-reservation', { detail: newReservation })
            );
          } else if (payload.eventType === 'UPDATE') {
            setReservations((prev) =>
              prev.map((r) =>
                r.id === payload.new.id ? (payload.new as Reservation) : r
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setReservations((prev) =>
              prev.filter((r) => r.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReservations]);

  const createReservation = async (
    customerName: string,
    songTitle: string,
    songArtist: string
  ) => {
    const { error } = await supabase.from('reservations').insert({
      customer_name: customerName,
      song_title: songTitle,
      song_artist: songArtist,
    });

    if (error) {
      console.error('Error creating reservation:', error);
      toast.error('Errore nella prenotazione');
      return false;
    }

    toast.success('Prenotazione inviata!');
    return true;
  };

  const completeReservation = async (id: string) => {
    const { error } = await supabase
      .from('reservations')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error completing reservation:', error);
      toast.error('Errore nel completamento');
      return false;
    }

    return true;
  };

  const reactivateReservation = async (id: string) => {
    const { error } = await supabase
      .from('reservations')
      .update({
        status: 'in_progress',
        completed_at: null,
      })
      .eq('id', id);

    if (error) {
      console.error('Error reactivating reservation:', error);
      toast.error('Errore nella riattivazione');
      return false;
    }

    return true;
  };

  const resetAllReservations = async () => {
    const { error } = await supabase.from('reservations').delete().neq('id', '');

    if (error) {
      console.error('Error resetting reservations:', error);
      toast.error('Errore nel reset');
      return false;
    }

    toast.success('Tutte le prenotazioni sono state cancellate');
    return true;
  };

  const activeReservations = reservations.filter((r) => r.status === 'in_progress');
  const completedReservations = reservations
    .filter((r) => r.status === 'completed')
    .sort((a, b) => {
      if (!a.completed_at || !b.completed_at) return 0;
      return new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime();
    });

  return {
    reservations,
    activeReservations,
    completedReservations,
    loading,
    createReservation,
    completeReservation,
    reactivateReservation,
    resetAllReservations,
  };
};
