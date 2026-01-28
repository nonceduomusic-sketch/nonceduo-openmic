import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSessionFingerprint } from './useUserBookingLimits';

const CONSECUTIVE_BLOCKED_KEY = 'consecutive_limit_blocked';

/**
 * Hook che monitora quando il limite consecutive viene sbloccato
 * (quando un altro utente prenota e resetta il nostro consecutive_songs a 0)
 * 
 * Strategia: invece di tracciare il valore precedente (che può essere inaffidabile),
 * usiamo un approccio più semplice:
 * - Quando consecutive_songs diventa 0 e l'utente era bloccato -> mostra notifica
 * - Monitoriamo anche NUOVE prenotazioni da altri utenti come trigger
 */
export const useConsecutiveUnlockNotification = (_eventIdProp: string | null) => {
  const sessionFingerprint = getSessionFingerprint();
  const notificationShownRef = useRef(false);

  // Monitor changes to reservations - when ANY new reservation is created,
  // check if our consecutive count is now 0
  useEffect(() => {
    if (!sessionFingerprint) return;

    const channelName = `consecutive-unlock-reservations-${Date.now()}`;
    
    const checkAndNotify = async () => {
      const isBlocked = localStorage.getItem(CONSECUTIVE_BLOCKED_KEY) === '1';
      if (!isBlocked || notificationShownRef.current) return;

      // Find active event
      const { data: freeMode } = await supabase
        .from('free_mode_settings')
        .select('id')
        .eq('is_active', true)
        .maybeSingle();
      
      let eventId = freeMode?.id;
      
      if (!eventId) {
        const { data: liveEvent } = await supabase
          .from('event_booking_rules')
          .select('id')
          .eq('event_status', 'live')
          .maybeSingle();
        eventId = liveEvent?.id;
      }

      if (!eventId) return;

      // Check our current consecutive count
      const { data } = await supabase
        .from('user_booking_counts')
        .select('consecutive_songs')
        .eq('event_id', eventId)
        .eq('session_fingerprint', sessionFingerprint)
        .maybeSingle();

      const consecutive = data?.consecutive_songs ?? 0;
      
      console.log('[ConsecutiveUnlock] Check triggered, consecutive:', consecutive, 'blocked:', isBlocked);

      if (consecutive === 0 && isBlocked) {
        notificationShownRef.current = true;
        toast.success('🎉 Sei di nuovo libero di prenotare!', {
          description: 'Un altro partecipante ha prenotato, ora tocca a te!',
          duration: 6000,
        });
        localStorage.removeItem(CONSECUTIVE_BLOCKED_KEY);
        
        // Reset flag after a bit so future blocks can trigger notifications
        setTimeout(() => {
          notificationShownRef.current = false;
        }, 3000);
      }
    };

    // Listen to new reservations (from anyone)
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reservations',
        },
        (payload) => {
          console.log('[ConsecutiveUnlock] New reservation detected');
          // Small delay to allow the consecutive count to be updated
          setTimeout(checkAndNotify, 500);
        }
      )
      .subscribe((status) => {
        console.log('[ConsecutiveUnlock] Reservations subscription:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionFingerprint]);

  // Also monitor direct changes to our user_booking_counts
  useEffect(() => {
    if (!sessionFingerprint) return;

    const channelName = `consecutive-unlock-counts-${sessionFingerprint.substring(0, 8)}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_booking_counts',
          filter: `session_fingerprint=eq.${sessionFingerprint}`,
        },
        (payload) => {
          const newData = payload.new as { consecutive_songs?: number };
          const newConsecutive = newData?.consecutive_songs ?? 0;
          const isBlocked = localStorage.getItem(CONSECUTIVE_BLOCKED_KEY) === '1';
          
          console.log('[ConsecutiveUnlock] Count update:', { newConsecutive, isBlocked });
          
          if (newConsecutive === 0 && isBlocked && !notificationShownRef.current) {
            notificationShownRef.current = true;
            toast.success('🎉 Sei di nuovo libero di prenotare!', {
              description: 'Un altro partecipante ha prenotato, ora tocca a te!',
              duration: 6000,
            });
            localStorage.removeItem(CONSECUTIVE_BLOCKED_KEY);
            
            setTimeout(() => {
              notificationShownRef.current = false;
            }, 3000);
          }
        }
      )
      .subscribe((status) => {
        console.log('[ConsecutiveUnlock] Counts subscription:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionFingerprint]);

  // Function to mark that the user was blocked by consecutive limit
  const setWasBlocked = useCallback((blocked: boolean) => {
    console.log('[ConsecutiveUnlock] setWasBlocked:', blocked);
    if (blocked) {
      localStorage.setItem(CONSECUTIVE_BLOCKED_KEY, '1');
      notificationShownRef.current = false; // Reset so notification can show
    } else {
      localStorage.removeItem(CONSECUTIVE_BLOCKED_KEY);
    }
  }, []);

  return { setWasBlocked };
};
