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
  dedication_message: string | null;
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

  const normalizeReservations = useCallback((rows: Reservation[]) => {
    // Realtime + manual refetch can cause duplicate rows if we always append on INSERT.
    // Keep the most recent version per id.
    const map = new Map<string, Reservation>();
    for (const r of rows) map.set(r.id, r);
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, []);

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

    setReservations(normalizeReservations((data || []) as Reservation[]));
    setLoading(false);
  }, [normalizeReservations]);

  useEffect(() => {
    fetchReservations();

    // Subscribe to realtime updates - use unique channel name to avoid conflicts
    const channelName = `reservations-changes-${Date.now()}`;
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
        },
      })
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
            setReservations((prev) => normalizeReservations([...prev, newReservation]));
            // Trigger notification for admin (in-app)
            window.dispatchEvent(
              new CustomEvent('new-reservation', { detail: newReservation })
            );
            // Send push notification to all admin devices (background)
            supabase.functions.invoke('push-notifications', {
              body: {
                action: 'send',
                title: '🎤 Nuova prenotazione!',
                body: `${newReservation.customer_name} - ${newReservation.song_title}`,
                tag: 'reservation-' + newReservation.id,
              },
            }).catch(err => {
              if (import.meta.env.DEV) {
                console.error('[useReservations] Failed to send push:', err);
              }
            });
          } else if (payload.eventType === 'UPDATE') {
            setReservations((prev) =>
              normalizeReservations(
                prev.map((r) => (r.id === payload.new.id ? (payload.new as Reservation) : r))
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setReservations((prev) => normalizeReservations(prev.filter((r) => r.id !== payload.old.id)));
          }
        }
      )
      .subscribe((status, err) => {
        if (import.meta.env.DEV) {
          console.log('[useReservations] Realtime subscription status:', status);
          if (err) console.error('[useReservations] Subscription error:', err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReservations, normalizeReservations]);

  const createReservation = async (
    customerName: string,
    songTitle: string,
    songArtist: string,
    dedicationMessage?: string
  ) => {
    const insertData = {
      customer_name: customerName,
      song_title: songTitle,
      song_artist: songArtist,
      dedication_message: dedicationMessage?.trim() || null,
    };

    const { error } = await supabase.from('reservations').insert([insertData]);

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

  const resetEverything = async () => {
    try {
      await callAdminApi('resetEverything');
      toast.success('Reset completo effettuato! Pronto per la prossima serata');
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error resetting everything:', error);
      }
      toast.error('Errore nel reset totale');
      return false;
    }
  };

  const resetOpenMic = async () => {
    try {
      await callAdminApi('resetOpenMic');
      toast.success('Prenotazioni Open Mic cancellate');
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error resetting open mic:', error);
      }
      toast.error('Errore nel reset Open Mic');
      return false;
    }
  };

  const resetMessages = async () => {
    try {
      await callAdminApi('resetMessages');
      toast.success('Messaggi e chat cancellate');
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error resetting messages:', error);
      }
      toast.error('Errore nel reset messaggi');
      return false;
    }
  };

  const resetSongStatuses = async () => {
    try {
      await callAdminApi('resetSongStatuses');
      toast.success('Tutte le canzoni sono ora prenotabili');
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error resetting song statuses:', error);
      }
      toast.error('Errore nel reset stati canzoni');
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
    resetEverything,
    resetOpenMic,
    resetMessages,
    resetSongStatuses,
    deleteReservation,
    deleteMultipleReservations,
    restoreReservation,
  };
};
