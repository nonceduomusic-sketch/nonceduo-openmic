import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSessionFingerprint } from './useUserBookingLimits';

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
      // Suppress toast on local server (no internet)
      const { isLocalServer } = await import('@/lib/productionUrl');
      if (!isLocalServer()) {
        toast.error('Errore nel caricamento delle prenotazioni');
      }
      // IMPORTANT: fail fast to avoid leaving the UI in an endless loading state
      setReservations([]);
      setLoading(false);
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

    // Polling fallback: refetch every 15s to catch missed realtime events
    // (covers silent WebSocket disconnects on local/unstable networks)
    const pollInterval = setInterval(() => {
      fetchReservations();
    }, 15000);

    // Refetch when tab becomes visible again (covers phone sleep, tab switch)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchReservations();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchReservations, normalizeReservations]);

  const createReservation = async (
    customerName: string,
    songTitle: string,
    songArtist: string,
    dedicationMessage?: string
  ) => {
    try {
      const sessionFingerprint = getSessionFingerprint();
      
      const { data, error } = await supabase.functions.invoke('push-notifications', {
        body: {
          action: 'create-reservation',
          customer_name: customerName,
          song_title: songTitle,
          song_artist: songArtist,
          dedication_message: dedicationMessage?.trim() || null,
          session_fingerprint: sessionFingerprint,
        },
      });

      if (error) {
        throw error;
      }
      
      // Check if backend returned an error message
      if (data?.error) {
        // Return structured error data for user limit warnings
        if (data.error_type === 'user_limit') {
          return { 
            success: false, 
            error: data.error,
            errorType: 'user_limit',
            limitType: data.limit_type,
            cooldownMinutes: data.cooldown_minutes,
            cooldownEndsAt: data.cooldown_ends_at,
            consecutiveCount: data.consecutive_count,
            consecutiveLimit: data.consecutive_limit
          };
        }
        toast.error(data.error);
        return false;
      }
      
      toast.success('Prenotazione inviata!');
      
      // Return success with limit reached info if present (post-booking warning)
      if (data?.limit_reached) {
        return { 
          success: true, 
          limitReached: data.limit_reached 
        };
      }
      
      return true;
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error creating reservation:', error);
      }
      const errorMessage = error?.message || 'Errore nella prenotazione';
      toast.error(errorMessage);
      return false;
    }
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

  const resetUserCounts = async () => {
    try {
      await callAdminApi('resetUserCounts');
      toast.success('Conteggi utenti resettati');
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error resetting user counts:', error);
      }
      toast.error('Errore nel reset conteggi utenti');
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
    refetch: fetchReservations,
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
    resetUserCounts,
  };
};
