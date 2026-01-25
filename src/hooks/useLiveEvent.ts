import { useState, useEffect, useMemo, useCallback } from 'react';
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
  booking_opens_at: string | null;
  booking_closes_at: string | null;
  close_minutes_before_end: number | null;
  openmic_enabled: boolean;
  openmic_max_songs: number | null;
  dediche_enabled: boolean;
  dediche_max_total: number | null;
  openmic_current_count: number;
  dediche_current_count: number;
  reopen_active: boolean;
  reopen_until: string | null;
  reopen_message: string | null;
  reopen_extra_songs: number | null;
  reopen_extra_dediche: number | null;
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

export interface FreeModeState {
  openmic: boolean;
  dediche: boolean;
  active: boolean;
}

export type EventState = 
  | { type: 'loading' }
  | { type: 'live'; event: LiveEvent }
  | { type: 'freemode'; formats: FreeModeState }
  | { type: 'upcoming'; events: UpcomingEvent[] }
  | { type: 'none' };

/**
 * Hook per gestire lo stato evento lato utente.
 * 
 * Priorità:
 * 1. Evento LIVE → Applica regole evento
 * 2. Serata Aperta (Free Mode) → Format attivi senza limiti
 * 3. Eventi READY → Pre-pagina eventi
 * 4. Nessuno → Pagina informativa
 */
export const useLiveEvent = () => {
  const [liveEvent, setLiveEvent] = useState<LiveEvent | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [freeMode, setFreeMode] = useState<FreeModeState>({ openmic: false, dediche: false, active: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
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
          close_minutes_before_end: liveData.close_minutes_before_end,
          openmic_enabled: liveData.openmic_enabled ?? true,
          openmic_max_songs: liveData.openmic_max_songs,
          dediche_enabled: liveData.dediche_enabled ?? true,
          dediche_max_total: liveData.dediche_max_total,
          openmic_current_count: liveData.openmic_current_count ?? 0,
          dediche_current_count: liveData.dediche_current_count ?? 0,
          reopen_active: liveData.reopen_active ?? false,
          reopen_until: liveData.reopen_until,
          reopen_message: liveData.reopen_message,
          reopen_extra_songs: liveData.reopen_extra_songs,
          reopen_extra_dediche: liveData.reopen_extra_dediche,
          closure_mode: liveData.closure_mode || 'overlay',
          closure_title: liveData.closure_title || 'Prenotazioni chiuse',
          closure_message: liveData.closure_message || 'Grazie per aver partecipato!',
          closure_redirect_url: liveData.closure_redirect_url,
        });
        setUpcomingEvents([]);
        setFreeMode({ openmic: false, dediche: false, active: false });
      } else {
        setLiveEvent(null);
        
        // Check free mode (global format settings)
        const { data: formatSettings, error: formatError } = await supabase
          .from('global_format_settings')
          .select('format_key, is_active')
          .in('format_key', ['openmic', 'dediche']);

        if (formatError) throw formatError;

        const openmicActive = formatSettings?.find(f => f.format_key === 'openmic')?.is_active ?? false;
        const dedicheActive = formatSettings?.find(f => f.format_key === 'dediche')?.is_active ?? false;
        const freeModeActive = openmicActive || dedicheActive;

        setFreeMode({
          openmic: openmicActive,
          dediche: dedicheActive,
          active: freeModeActive,
        });

        // Only fetch upcoming events if not in free mode
        if (!freeModeActive) {
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
        } else {
          setUpcomingEvents([]);
        }
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Errore nel caricamento degli eventi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();

    // Subscribe to realtime changes on both tables
    const eventsChannel = supabase
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

    const formatsChannel = supabase
      .channel(`global-formats-live-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'global_format_settings',
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(formatsChannel);
    };
  }, [fetchEvents]);

  const eventState = useMemo((): EventState => {
    if (loading) return { type: 'loading' };
    if (liveEvent) return { type: 'live', event: liveEvent };
    if (freeMode.active) return { type: 'freemode', formats: freeMode };
    if (upcomingEvents.length > 0) return { type: 'upcoming', events: upcomingEvents };
    return { type: 'none' };
  }, [loading, liveEvent, freeMode, upcomingEvents]);

  // Helpers for format visibility - checks both event and free mode
  const isOpenmicVisible = useMemo(() => {
    if (liveEvent) {
      return liveEvent.event_type === 'openmic' || liveEvent.event_type === 'both';
    }
    return freeMode.openmic;
  }, [liveEvent, freeMode.openmic]);

  const isDedicheVisible = useMemo(() => {
    if (liveEvent) {
      return liveEvent.event_type === 'dediche' || liveEvent.event_type === 'both';
    }
    return freeMode.dediche;
  }, [liveEvent, freeMode.dediche]);

  // Check if currently in free mode (no live event, but formats active)
  const isFreeMode = useMemo(() => {
    return !liveEvent && freeMode.active;
  }, [liveEvent, freeMode.active]);

  return {
    eventState,
    liveEvent,
    upcomingEvents,
    freeMode,
    isFreeMode,
    loading,
    error,
    isOpenmicVisible,
    isDedicheVisible,
    refetch: fetchEvents,
  };
};
