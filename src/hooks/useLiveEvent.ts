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
  eventName: string | null;
  pinEnabled: boolean;
  pinCode: string | null;
  // Limits
  openmicMaxSongs: number | null;
  openmicCurrentCount: number;
  dedicheMaxTotal: number | null;
  dedicheCurrentCount: number;
  expiresAt: string | null;
  // Final period limits (ultimi X minuti)
  openmicFinalLimitEnabled: boolean;
  openmicFinalLimitMinutes: number | null;
  openmicFinalLimitSongs: number | null;
  dedicheFinalLimitEnabled: boolean;
  dedicheFinalLimitMinutes: number | null;
  dedicheFinalLimitTotal: number | null;
  // Reopening
  reopenActive: boolean;
  reopenUntil: string | null;
  reopenMessage: string | null;
  reopenExtraSongs: number | null;
  reopenExtraDediche: number | null;
  // Closure
  closureMode: string;
  closureTitle: string;
  closureMessage: string;
  closureRedirectUrl: string | null;
  closurePreviewEnabled: boolean;
  // Countdown config
  countdownEndShowMinutes: number | null;
  endMode: string | null;
  // Consultable mode
  isConsultableMode: boolean;
  protectRepertoire: boolean;
  // Catalog preview
  catalogPreviewEnabled: boolean;
  catalogPreviewLimitType: 'percent' | 'count';
  catalogPreviewLimitValue: number;
  catalogPreviewMessage: string;
}

export type EventState = 
  | { type: 'loading' }
  | { type: 'live'; event: LiveEvent }
  | { type: 'freemode'; formats: FreeModeState }
  | { type: 'upcoming'; events: UpcomingEvent[] }
  | { type: 'preview'; previewSettings: CatalogPreviewSettings }
  | { type: 'none' };

export interface CatalogPreviewSettings {
  enabled: boolean;
  limitType: 'percent' | 'count';
  limitValue: number;
  message: string;
  protectRepertoire: boolean;
}

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
  const [freeMode, setFreeMode] = useState<FreeModeState>({
    openmic: false,
    dediche: false,
    active: false,
    eventName: null,
    pinEnabled: false,
    pinCode: null,
    openmicMaxSongs: null,
    openmicCurrentCount: 0,
    dedicheMaxTotal: null,
    dedicheCurrentCount: 0,
    expiresAt: null,
    openmicFinalLimitEnabled: false,
    openmicFinalLimitMinutes: null,
    openmicFinalLimitSongs: null,
    dedicheFinalLimitEnabled: false,
    dedicheFinalLimitMinutes: null,
    dedicheFinalLimitTotal: null,
    reopenActive: false,
    reopenUntil: null,
    reopenMessage: null,
    reopenExtraSongs: null,
    reopenExtraDediche: null,
    closureMode: 'overlay',
    closureTitle: 'Prenotazioni chiuse',
    closureMessage: 'Grazie per aver partecipato!',
    closureRedirectUrl: null,
    closurePreviewEnabled: false,
    countdownEndShowMinutes: 10,
    endMode: 'manual',
    isConsultableMode: false,
    protectRepertoire: true,
    catalogPreviewEnabled: false,
    catalogPreviewLimitType: 'percent',
    catalogPreviewLimitValue: 30,
    catalogPreviewMessage: 'e molto altro... vienilo a scoprire partecipando ai nostri eventi!',
  });
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
        setFreeMode({
          openmic: false,
          dediche: false,
          active: false,
          eventName: null,
          pinEnabled: false,
          pinCode: null,
          openmicMaxSongs: null,
          openmicCurrentCount: 0,
          dedicheMaxTotal: null,
          dedicheCurrentCount: 0,
          expiresAt: null,
          openmicFinalLimitEnabled: false,
          openmicFinalLimitMinutes: null,
          openmicFinalLimitSongs: null,
          dedicheFinalLimitEnabled: false,
          dedicheFinalLimitMinutes: null,
          dedicheFinalLimitTotal: null,
          reopenActive: false,
          reopenUntil: null,
          reopenMessage: null,
          reopenExtraSongs: null,
          reopenExtraDediche: null,
          closureMode: 'overlay',
          closureTitle: 'Prenotazioni chiuse',
          closureMessage: 'Grazie per aver partecipato!',
          closureRedirectUrl: null,
          closurePreviewEnabled: false,
          countdownEndShowMinutes: 10,
          endMode: 'manual',
          isConsultableMode: false,
          protectRepertoire: true,
          catalogPreviewEnabled: false,
          catalogPreviewLimitType: 'percent',
          catalogPreviewLimitValue: 30,
          catalogPreviewMessage: 'e molto altro... vienilo a scoprire partecipando ai nostri eventi!',
        });
      } else {
        setLiveEvent(null);
        
        // Check free mode settings - fetch ALL fields needed for limits, reopening, and closure
        const { data: freeModeData, error: freeModeError } = await supabase
          .from('free_mode_settings')
          .select('*')
          .eq('is_active', true)
          .maybeSingle();

        if (freeModeError) throw freeModeError;

        const openmicActive = freeModeData?.is_active && freeModeData?.openmic_enabled;
        const dedicheActive = freeModeData?.is_active && freeModeData?.dediche_enabled;
        const freeModeActive = freeModeData?.is_active ?? false;

        setFreeMode({
          openmic: openmicActive ?? false,
          dediche: dedicheActive ?? false,
          active: freeModeActive,
          eventName: freeModeData?.event_name ?? null,
          pinEnabled: freeModeData?.pin_enabled ?? false,
          pinCode: freeModeData?.pin_code ?? null,
          openmicMaxSongs: freeModeData?.openmic_max_songs ?? null,
          openmicCurrentCount: freeModeData?.openmic_current_count ?? 0,
          dedicheMaxTotal: freeModeData?.dediche_max_total ?? null,
          dedicheCurrentCount: freeModeData?.dediche_current_count ?? 0,
          expiresAt: freeModeData?.expires_at ?? null,
          openmicFinalLimitEnabled: freeModeData?.openmic_final_limit_enabled ?? false,
          openmicFinalLimitMinutes: freeModeData?.openmic_final_limit_minutes ?? null,
          openmicFinalLimitSongs: freeModeData?.openmic_final_limit_songs ?? null,
          dedicheFinalLimitEnabled: freeModeData?.dediche_final_limit_enabled ?? false,
          dedicheFinalLimitMinutes: freeModeData?.dediche_final_limit_minutes ?? null,
          dedicheFinalLimitTotal: freeModeData?.dediche_final_limit_total ?? null,
          reopenActive: freeModeData?.reopen_active ?? false,
          reopenUntil: freeModeData?.reopen_until ?? null,
          reopenMessage: freeModeData?.reopen_message ?? null,
          reopenExtraSongs: freeModeData?.reopen_extra_songs ?? null,
          reopenExtraDediche: freeModeData?.reopen_extra_dediche ?? null,
          closureMode: freeModeData?.closure_mode ?? 'overlay',
          closureTitle: freeModeData?.closure_title ?? 'Prenotazioni chiuse',
          closureMessage: freeModeData?.closure_message ?? 'Grazie per aver partecipato!',
          closureRedirectUrl: freeModeData?.closure_redirect_url ?? null,
          closurePreviewEnabled: freeModeData?.closure_preview_enabled ?? false,
          countdownEndShowMinutes: freeModeData?.countdown_end_show_minutes ?? 10,
          endMode: freeModeData?.end_mode ?? 'manual',
          isConsultableMode: freeModeData?.is_consultable_mode ?? false,
          protectRepertoire: freeModeData?.protect_repertoire ?? true,
          catalogPreviewEnabled: (freeModeData as Record<string, unknown>)?.catalog_preview_enabled as boolean ?? false,
          catalogPreviewLimitType: ((freeModeData as Record<string, unknown>)?.catalog_preview_limit_type as 'percent' | 'count') ?? 'percent',
          catalogPreviewLimitValue: (freeModeData as Record<string, unknown>)?.catalog_preview_limit_value as number ?? 30,
          catalogPreviewMessage: (freeModeData as Record<string, unknown>)?.catalog_preview_message as string ?? 'e molto altro... vienilo a scoprire partecipando ai nostri eventi!',
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

    const freeModeChannel = supabase
      .channel(`free-mode-live-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'free_mode_settings',
        },
        (payload) => {
          console.log('[useLiveEvent] Free mode settings changed:', payload);
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(freeModeChannel);
    };
  }, [fetchEvents]);

  const eventState = useMemo((): EventState => {
    if (loading) return { type: 'loading' };
    if (liveEvent) return { type: 'live', event: liveEvent };
    if (freeMode.active) return { type: 'freemode', formats: freeMode };
    if (upcomingEvents.length > 0) return { type: 'upcoming', events: upcomingEvents };
    // Show catalog preview if enabled (even without events)
    if (freeMode.catalogPreviewEnabled || freeMode.isConsultableMode) {
      return { 
        type: 'preview', 
        previewSettings: {
          enabled: true,
          limitType: freeMode.catalogPreviewLimitType,
          limitValue: freeMode.catalogPreviewLimitValue,
          message: freeMode.catalogPreviewMessage,
          protectRepertoire: freeMode.protectRepertoire,
        }
      };
    }
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
