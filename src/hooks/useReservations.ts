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

// Helper to call admin-reservations edge function
const callAdminApi = async (action: string, data: Record<string, unknown> = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Non autorizzato');
  }

  const response = await supabase.functions.invoke('admin-reservations', {
    body: { action, ...data },
  });

  if (response.error) {
    throw new Error(response.error.message || 'Errore nella richiesta');
  }

  return response.data;
};

export const useReservations = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReservations = useCallback(async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching reservations:', error);
      }
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
      if (import.meta.env.DEV) {
        console.error('Error creating reservation:', error);
      }
      toast.error('Errore nella prenotazione');
      return false;
    }

    toast.success('Prenotazione inviata!');
    return true;
  };

  const completeReservation = async (id: string) => {
    try {
      await callAdminApi('complete', { id });
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error completing reservation:', error);
      }
      toast.error('Errore nel completamento');
      return false;
    }
  };

  const reactivateReservation = async (id: string) => {
    try {
      await callAdminApi('reactivate', { id });
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error reactivating reservation:', error);
      }
      toast.error('Errore nella riattivazione');
      return false;
    }
  };

  const resetAllReservations = async () => {
    try {
      await callAdminApi('resetAll');
      toast.success('Tutte le prenotazioni sono state cancellate');
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error resetting reservations:', error);
      }
      toast.error('Errore nel reset');
      return false;
    }
  };

  const resetActiveReservations = async () => {
    try {
      await callAdminApi('resetActive');
      toast.success('Prenotazioni in corso cancellate');
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error resetting active reservations:', error);
      }
      toast.error('Errore nel reset delle prenotazioni in corso');
      return false;
    }
  };

  const resetCompletedReservations = async () => {
    try {
      await callAdminApi('resetCompleted');
      toast.success('Prenotazioni completate cancellate');
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error resetting completed reservations:', error);
      }
      toast.error('Errore nel reset delle prenotazioni completate');
      return false;
    }
  };

  const deleteReservation = async (id: string) => {
    try {
      await callAdminApi('delete', { id });
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting reservation:', error);
      }
      toast.error('Errore nella cancellazione');
      return false;
    }
  };

  const deleteMultipleReservations = async (ids: string[]) => {
    try {
      await callAdminApi('deleteMultiple', { ids });
      toast.success(`${ids.length} prenotazioni cancellate`);
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting reservations:', error);
      }
      toast.error('Errore nella cancellazione');
      return false;
    }
  };

  const restoreReservation = async (reservation: Reservation) => {
    try {
      await callAdminApi('restore', { reservation });
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error restoring reservation:', error);
      }
      toast.error('Errore nel ripristino');
      return false;
    }
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
    resetActiveReservations,
    resetCompletedReservations,
    deleteReservation,
    deleteMultipleReservations,
    restoreReservation,
  };
};
