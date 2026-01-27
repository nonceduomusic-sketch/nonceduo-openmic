import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSessionFingerprint } from './useUserBookingLimits';

/**
 * Hook che monitora quando il limite consecutive viene sbloccato
 * (quando un altro utente prenota e resetta il nostro consecutive_songs a 0)
 */
export const useConsecutiveUnlockNotification = (eventIdProp: string | null) => {
  const wasBlockedRef = useRef(false);
  const sessionFingerprint = getSessionFingerprint();
  const [eventId, setEventId] = useState<string | null>(eventIdProp);

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

  useEffect(() => {
    if (!eventId || !sessionFingerprint) return;

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
          const oldData = payload.old as any;
          const newData = payload.new as any;
          
          // Check if consecutive_songs was reset to 0 (or lower than before)
          // and we were previously blocked
          if (
            oldData?.consecutive_songs > 0 &&
            newData?.consecutive_songs === 0 &&
            wasBlockedRef.current
          ) {
            // Show unlock notification
            toast.success('🎉 Sei di nuovo libero di prenotare!', {
              description: 'Un altro partecipante ha prenotato, ora tocca a te!',
              duration: 5000,
            });
            wasBlockedRef.current = false;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, sessionFingerprint]);

  // Function to mark that the user was blocked by consecutive limit
  const setWasBlocked = (blocked: boolean) => {
    wasBlockedRef.current = blocked;
  };

  return { setWasBlocked };
};
