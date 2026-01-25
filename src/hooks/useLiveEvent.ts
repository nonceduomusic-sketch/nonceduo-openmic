import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type EventStatus = 'draft' | 'ready' | 'live' | 'closed';
export type EventType = 'openmic' | 'dediche' | 'both';

export interface LiveEvent {
  id: string;
  event_name: string;
  event_type: EventType;
  event_status: EventStatus;
  event_date: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
  pin_required: boolean;
  pin_code: string | null;
  // Booking rules
  booking_opens_at: string | null;
  booking_closes_at: string | null;
  openmic_enabled: boolean;
  openmic_max_songs: number | null;
  dediche_enabled: boolean;
  dediche_max_total: number | null;
  // Current counts
  openmic_current_count: number;
  dediche_current_count: number;
  // Reopen
  reopen_active: boolean;
  reopen_until: string | null;
  reopen_message: string | null;
  // Closure
  closure_mode: string;
  closure_title: string;
  closure_message: string;
  closure_redirect_url: string | null;
}

export interface UpcomingEvent {
  id: string;
  event_name: string;
  event_type: EventType;
  event_status: EventStatus;
  event_date: string | null;
  event_start_time: string | null;
}

export type EventState = 
  | { type: 'loading' }
  | { type: 'live'; event: LiveEvent }
  | { type: 'upcoming'; events: UpcomingEvent[] }
  | { type: 'none' };

/**
 * Hook per gestire lo stato evento lato utente.
 * 
 * Priorità:
 * 1. Se esiste un evento con event_status = 'live' → mostra evento live
 * 2. Se esistono eventi con event_status = 'ready' → mostra pre-pagina eventi
 * 3. Altrimenti → mostra stato "in preparazione"
 */
export const useLiveEvent = () => {
  const [liveEvent, setLiveEvent] = useState<LiveEvent | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      // Fetch live event first
      const { data: liveData, error: liveError } = await supabase
        .from('event_booking_rules')
        .select('*')
        .eq('event_status', 'live')
        .maybeSingle();

      if (liveError) throw liveError;

      if (liveData) {
        setLiveEvent({
          id: liveData.id,
          event_name: liveData.event_name || 'Serata Live',
          event_type: (liveData.event_type as EventType) || 'both',
          event_status: 'live',
          event_date: liveData.event_date,
          event_start_time: liveData.event_start_time,
          event_end_time: liveData.event_end_time,
          pin_required: liveData.pin_required || false,
          pin_code: liveData.pin_code,
          booking_opens_at: liveData.booking_opens_at,
          booking_closes_at: liveData.booking_closes_at,
          openmic_enabled: liveData.openmic_enabled ?? true,
          openmic_max_songs: liveData.openmic_max_songs,
          dediche_enabled: liveData.dediche_enabled ?? true,
          dediche_max_total: liveData.dediche_max_total,
          openmic_current_count: liveData.openmic_current_count ?? 0,
          dediche_current_count: liveData.dediche_current_count ?? 0,
          reopen_active: liveData.reopen_active ?? false,
          reopen_until: liveData.reopen_until,
          reopen_message: liveData.reopen_message,
          closure_mode: liveData.closure_mode || 'overlay',
          closure_title: liveData.closure_title || 'Prenotazioni chiuse',
          closure_message: liveData.closure_message || 'Grazie per aver partecipato!',
          closure_redirect_url: liveData.closure_redirect_url,
        });
        setUpcomingEvents([]);
      } else {
        setLiveEvent(null);
        
        // Fetch upcoming events (ready status)
        const { data: upcomingData, error: upcomingError } = await supabase
          .from('event_booking_rules')
          .select('id, event_name, event_type, event_status, event_date, event_start_time')
          .eq('event_status', 'ready')
          .order('event_date', { ascending: true, nullsFirst: false });

        if (upcomingError) throw upcomingError;

        setUpcomingEvents(
          (upcomingData || []).map(e => ({
            id: e.id,
            event_name: e.event_name || 'Serata Live',
            event_type: (e.event_type as EventType) || 'both',
            event_status: 'ready' as EventStatus,
            event_date: e.event_date,
            event_start_time: e.event_start_time,
          }))
        );
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Errore nel caricamento degli eventi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`live-event-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_booking_rules',
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const eventState = useMemo((): EventState => {
    if (loading) return { type: 'loading' };
    if (liveEvent) return { type: 'live', event: liveEvent };
    if (upcomingEvents.length > 0) return { type: 'upcoming', events: upcomingEvents };
    return { type: 'none' };
  }, [loading, liveEvent, upcomingEvents]);

  // Helpers for format visibility
  const isOpenmicVisible = useMemo(() => {
    if (!liveEvent) return false;
    return liveEvent.event_type === 'openmic' || liveEvent.event_type === 'both';
  }, [liveEvent]);

  const isDedicheVisible = useMemo(() => {
    if (!liveEvent) return false;
    return liveEvent.event_type === 'dediche' || liveEvent.event_type === 'both';
  }, [liveEvent]);

  return {
    eventState,
    liveEvent,
    upcomingEvents,
    loading,
    error,
    isOpenmicVisible,
    isDedicheVisible,
    refetch: fetchEvents,
  };
};
