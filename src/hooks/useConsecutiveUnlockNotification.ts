import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSessionFingerprint } from './useUserBookingLimits';

const CONSECUTIVE_BLOCKED_KEY = 'consecutive_limit_blocked';

/**
 * Hook che monitora quando il limite consecutive viene sbloccato
 * (quando un altro utente prenota e resetta il nostro consecutive_songs a 0)
 */
export const useConsecutiveUnlockNotification = (eventIdProp: string | null) => {
  const wasBlockedRef = useRef(false);
  const sessionFingerprint = getSessionFingerprint();
  const [eventId, setEventId] = useState<string | null>(eventIdProp);
  const lastConsecutiveRef = useRef<number | null>(null);

  // Sync from localStorage so the notification still works even if the booking modal is closed/unmounted.
  useEffect(() => {
    wasBlockedRef.current = localStorage.getItem(CONSECUTIVE_BLOCKED_KEY) === '1';
  }, []);

  // Fetch actual eventId from active event if not provided
  useEffect(() => {
    const fetchActiveEventId = async () => {
      // Try free mode first
      const { data: freeMode } = await supabase
        .from('free_mode_settings')
        .select('id')
        .eq('is_active', true)
        .maybeSingle();
      
      if (freeMode?.id) {
        setEventId(freeMode.id);
        return;
      }
      
      // Try scheduled event
      const { data: liveEvent } = await supabase
        .from('event_booking_rules')
        .select('id')
        .eq('event_status', 'live')
        .maybeSingle();
      
      if (liveEvent?.id) {
        setEventId(liveEvent.id);
      }
    };
    
    if (!eventIdProp || eventIdProp === 'active') {
      fetchActiveEventId();
    }
  }, [eventIdProp]);

  // Fetch initial consecutive count
  useEffect(() => {
    if (!eventId || !sessionFingerprint) return;
    
    const fetchInitialCount = async () => {
      const { data } = await supabase
        .from('user_booking_counts')
        .select('consecutive_songs')
        .eq('event_id', eventId)
        .eq('session_fingerprint', sessionFingerprint)
        .maybeSingle();
      
      if (data) {
        lastConsecutiveRef.current = data.consecutive_songs || 0;
      }
    };
    
    fetchInitialCount();
  }, [eventId, sessionFingerprint]);

  useEffect(() => {
    if (!sessionFingerprint) return;

    // Subscribe to ALL changes on user_booking_counts for our session
    const channelName = `consecutive-unlock-${sessionFingerprint}-${Date.now()}`;
    
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
          const newData = payload.new as any;
          const oldConsecutive = lastConsecutiveRef.current;
          const newConsecutive = newData?.consecutive_songs ?? 0;

          const isBlocked =
            wasBlockedRef.current || localStorage.getItem(CONSECUTIVE_BLOCKED_KEY) === '1';
          
          console.log('[ConsecutiveUnlock] Update received:', {
            oldConsecutive,
            newConsecutive,
            wasBlocked: wasBlockedRef.current
          });
          
          // Check if consecutive_songs was reset to 0 and we were blocked
          if (
            oldConsecutive !== null &&
            oldConsecutive > 0 &&
            newConsecutive === 0 &&
            isBlocked
          ) {
            // Show unlock notification
            toast.success('🎉 Sei di nuovo libero di prenotare!', {
              description: 'Un altro partecipante ha prenotato, ora tocca a te!',
              duration: 5000,
            });
            wasBlockedRef.current = false;
            localStorage.removeItem(CONSECUTIVE_BLOCKED_KEY);
          }
          
          // Update last known value
          lastConsecutiveRef.current = newConsecutive;
        }
      )
      .subscribe((status) => {
        console.log('[ConsecutiveUnlock] Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionFingerprint]);

  // Function to mark that the user was blocked by consecutive limit
  const setWasBlocked = useCallback((blocked: boolean) => {
    console.log('[ConsecutiveUnlock] setWasBlocked:', blocked);
    wasBlockedRef.current = blocked;

    if (blocked) {
      localStorage.setItem(CONSECUTIVE_BLOCKED_KEY, '1');
    } else {
      localStorage.removeItem(CONSECUTIVE_BLOCKED_KEY);
    }
  }, []);

  return { setWasBlocked };
};
