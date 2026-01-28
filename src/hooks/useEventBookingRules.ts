import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type EventType = 'openmic' | 'dediche' | 'both';
export type EventStatus = 'draft' | 'ready' | 'live' | 'closed';

export interface EventBookingRules {
  id: string;
  event_name: string | null;
  event_date: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
  event_type: EventType;
  event_status: EventStatus;
  pin_code: string | null;
  pin_required: boolean;
  booking_opens_at: string | null;
  booking_closes_at: string | null;
  close_minutes_before_end: number | null;
  openmic_enabled: boolean;
  openmic_max_songs: number | null;
  openmic_final_limit_enabled: boolean;
  openmic_final_limit_songs: number | null;
  openmic_final_limit_minutes: number | null;
  dediche_enabled: boolean;
  dediche_max_total: number | null;
  // Dediche final limit fields
  dediche_final_limit_enabled: boolean;
  dediche_final_limit_total: number | null;
  dediche_final_limit_minutes: number | null;
  voting_enabled: boolean;
  openmic_current_count: number;
  dediche_current_count: number;
  reopen_active: boolean;
  reopen_until: string | null;
  reopen_mode: string | null;
  reopen_extra_songs: number | null;
  reopen_extra_dediche: number | null;
  reopen_songs_used: number;
  reopen_dediche_used: number;
  reopen_message: string | null;
  closure_mode: string;
  closure_title: string | null;
  closure_message: string | null;
  closure_redirect_url: string | null;
  closure_preview_enabled: boolean;
  // User limits fields
  user_limit_enabled: boolean;
  user_limit_mode: 'session' | 'session_name';
  user_limit_songs_total: number | null;
  user_limit_dediche_total: number | null;
  user_limit_songs_interval: number | null;
  user_limit_interval_minutes: number | null;
  user_limit_consecutive_songs: number | null;
  user_limit_cooldown_message: string | null;
  // Countdown thresholds
  countdown_start_show_minutes: number | null;
  countdown_end_show_minutes: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Helper per normalizzare i dati dal database
const normalizeEventRules = (data: any): EventBookingRules => ({
  ...data,
  event_type: data.event_type || 'both',
  event_status: data.event_status || 'draft',
  pin_required: data.pin_required ?? false,
  openmic_enabled: data.openmic_enabled ?? true,
  dediche_enabled: data.dediche_enabled ?? true,
  voting_enabled: data.voting_enabled ?? true,
  openmic_current_count: data.openmic_current_count ?? 0,
  dediche_current_count: data.dediche_current_count ?? 0,
  reopen_songs_used: data.reopen_songs_used ?? 0,
  reopen_dediche_used: data.reopen_dediche_used ?? 0,
  reopen_active: data.reopen_active ?? false,
  is_active: data.is_active ?? false,
  closure_preview_enabled: data.closure_preview_enabled ?? false,
  // Dediche final limit
  dediche_final_limit_enabled: data.dediche_final_limit_enabled ?? false,
  dediche_final_limit_total: data.dediche_final_limit_total ?? null,
  dediche_final_limit_minutes: data.dediche_final_limit_minutes ?? null,
  // User limits
  user_limit_enabled: data.user_limit_enabled ?? false,
  user_limit_mode: data.user_limit_mode || 'session',
  user_limit_songs_total: data.user_limit_songs_total ?? null,
  user_limit_dediche_total: data.user_limit_dediche_total ?? null,
  user_limit_songs_interval: data.user_limit_songs_interval ?? null,
  user_limit_interval_minutes: data.user_limit_interval_minutes ?? null,
  user_limit_consecutive_songs: data.user_limit_consecutive_songs ?? null,
  user_limit_cooldown_message: data.user_limit_cooldown_message ?? null,
  // Countdown
  countdown_start_show_minutes: data.countdown_start_show_minutes ?? null,
  countdown_end_show_minutes: data.countdown_end_show_minutes ?? null,
});

export const useEventBookingRules = () => {
  const [rules, setRules] = useState<EventBookingRules | null>(null);
  const [liveEvent, setLiveEvent] = useState<EventBookingRules | null>(null);
  const [allRules, setAllRules] = useState<EventBookingRules[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('event_booking_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const typedData = (data || []).map(normalizeEventRules);
      setAllRules(typedData);
      
      // Trova l'evento live (unico)
      const live = typedData.find(r => r.event_status === 'live') || null;
      setLiveEvent(live);
      
      // Set the active/selected rule (prefer live, then first)
      const activeRule = live || typedData.find(r => r.is_active) || typedData[0] || null;
      setRules(activeRule);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento regole');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`event-booking-rules-realtime-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_booking_rules',
        },
        () => {
          fetchRules();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRules]);

  // Update rules
  const updateRules = async (updates: Partial<EventBookingRules>): Promise<boolean> => {
    if (!rules?.id) return false;

    try {
      const finalUpdates = { ...updates, updated_at: new Date().toISOString() };
      
      const { error: updateError } = await supabase
        .from('event_booking_rules')
        .update(finalUpdates)
        .eq('id', rules.id);

      if (updateError) throw updateError;
      
      // Aggiorna lo stato locale immediatamente per una UI reattiva
      setRules(prev => prev ? { ...prev, ...finalUpdates } : prev);
      
      // Aggiorna anche allRules se necessario
      setAllRules(prev => prev.map(r => 
        r.id === rules.id ? { ...r, ...finalUpdates } : r
      ));
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nell\'aggiornamento');
      return false;
    }
  };

  // Seleziona un evento specifico per la gestione
  const selectEvent = (eventId: string) => {
    const found = allRules.find(r => r.id === eventId);
    if (found) setRules(found);
  };

  // Toggle active state (legacy, mantenuto per compatibilità)
  const toggleActive = async (active: boolean): Promise<boolean> => {
    return updateRules({ is_active: active });
  };

  // Cambia lo stato workflow di un evento
  const setEventStatus = async (eventId: string, newStatus: EventStatus): Promise<boolean> => {
    try {
      // Ottieni i dati dell'evento per gestire correttamente il PIN
      const targetEvent = allRules.find(r => r.id === eventId);
      
      // Se stiamo mettendo un evento in "live", chiudiamo tutti gli altri eventi live
      if (newStatus === 'live') {
        // Prima chiudi gli altri eventi live
        const { error: closeError } = await supabase
          .from('event_booking_rules')
          .update({ event_status: 'closed' })
          .eq('event_status', 'live')
          .neq('id', eventId);

        if (closeError) throw closeError;
        
        // Disattiva TUTTE le live_sessions esistenti (per pulizia)
        await supabase
          .from('live_sessions')
          .update({ 
            is_active: false, 
            deactivated_at: new Date().toISOString() 
          })
          .eq('is_active', true);

        // Se l'evento richiede PIN, crea una nuova live_session
        if (targetEvent?.pin_required && targetEvent?.pin_code) {
          // Determina quali format sono protetti in base al tipo evento
          const protectedFormats: string[] = [];
          if (targetEvent.event_type === 'openmic' || targetEvent.event_type === 'both') {
            protectedFormats.push('openmic');
          }
          if (targetEvent.event_type === 'dediche' || targetEvent.event_type === 'both') {
            protectedFormats.push('dediche');
          }

          const { error: sessionError } = await supabase
            .from('live_sessions')
            .insert({
              section: 'event',
              pin_code: targetEvent.pin_code.toUpperCase().trim(),
              protected_formats: protectedFormats,
              is_active: true,
              expires_at: null, // L'evento gestisce la scadenza
            });

          if (sessionError) {
            console.error('[setEventStatus] Error creating live_session:', sessionError);
            // Non blocchiamo l'attivazione dell'evento, ma logghiamo l'errore
          } else {
            console.log('[setEventStatus] Created live_session with PIN for event:', eventId);
          }
        }
      }

      // Se stiamo CHIUDENDO un evento live, disattiviamo la live_session (invalida tutti i PIN)
      if (newStatus === 'closed' && targetEvent?.event_status === 'live') {
        const { error: deactivateError } = await supabase
          .from('live_sessions')
          .update({ 
            is_active: false, 
            deactivated_at: new Date().toISOString() 
          })
          .eq('is_active', true);

        if (deactivateError) {
          console.error('[setEventStatus] Error deactivating live_session:', deactivateError);
        } else {
          console.log('[setEventStatus] Deactivated live_sessions - all PIN sessions invalidated');
        }
      }

      // Aggiorna lo stato dell'evento target
      const { error: updateError } = await supabase
        .from('event_booking_rules')
        .update({ 
          event_status: newStatus,
          is_active: newStatus === 'live', // Sync legacy field
        })
        .eq('id', eventId);

      if (updateError) throw updateError;
      
      await fetchRules();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel cambio stato');
      return false;
    }
  };

  // Attiva un evento (ready → live)
  const goLive = async (eventId?: string): Promise<boolean> => {
    const targetId = eventId || rules?.id;
    if (!targetId) return false;
    return setEventStatus(targetId, 'live');
  };

  // Chiudi un evento (live → closed)
  const closeEvent = async (eventId?: string): Promise<boolean> => {
    const targetId = eventId || rules?.id;
    if (!targetId) return false;
    return setEventStatus(targetId, 'closed');
  };

  // Aggiorna PIN - sincronizza anche con live_sessions se l'evento è LIVE
  const updatePin = async (pinCode: string | null, pinRequired: boolean): Promise<boolean> => {
    if (!rules?.id) return false;
    
    try {
      const { error: updateError } = await supabase
        .from('event_booking_rules')
        .update({ 
          pin_code: pinCode,
          pin_required: pinRequired,
        })
        .eq('id', rules.id);

      if (updateError) throw updateError;

      // Se l'evento è LIVE, aggiorna anche la live_session
      if (rules.event_status === 'live') {
        if (pinRequired && pinCode) {
          // Determina quali format sono protetti in base al tipo evento
          const protectedFormats: string[] = [];
          if (rules.event_type === 'openmic' || rules.event_type === 'both') {
            protectedFormats.push('openmic');
          }
          if (rules.event_type === 'dediche' || rules.event_type === 'both') {
            protectedFormats.push('dediche');
          }

          // Cerca una live_session attiva
          const { data: existingSession } = await supabase
            .from('live_sessions')
            .select('id')
            .eq('is_active', true)
            .maybeSingle();

          if (existingSession) {
            // Aggiorna il PIN - questo invaliderà automaticamente tutte le pin_sessions
            // grazie al trigger on_live_session_pin_change
            await supabase
              .from('live_sessions')
              .update({ 
                pin_code: pinCode.toUpperCase().trim(),
                protected_formats: protectedFormats,
              })
              .eq('id', existingSession.id);
            
            console.log('[updatePin] Updated live_session PIN - all user sessions invalidated');
          } else {
            // Crea nuova live_session
            await supabase
              .from('live_sessions')
              .insert({
                section: 'event',
                pin_code: pinCode.toUpperCase().trim(),
                protected_formats: protectedFormats,
                is_active: true,
              });
            
            console.log('[updatePin] Created new live_session with PIN');
          }
        } else {
          // PIN disabilitato - disattiva la live_session
          await supabase
            .from('live_sessions')
            .update({ 
              is_active: false, 
              deactivated_at: new Date().toISOString() 
            })
            .eq('is_active', true);
          
          console.log('[updatePin] PIN disabled - deactivated live_session');
        }
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore aggiornamento PIN');
      return false;
    }
  };

  // Genera un PIN casuale a 4 cifre
  const generatePin = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  // Create new event rules
  const createRules = async (newRules: Partial<EventBookingRules>): Promise<string | null> => {
    try {
      const { data, error: insertError } = await supabase
        .from('event_booking_rules')
        .insert({
          ...newRules,
          event_status: newRules.event_status || 'draft',
          event_type: newRules.event_type || 'both',
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      await fetchRules();
      return data?.id || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella creazione');
      return null;
    }
  };

  // Duplica un evento esistente come bozza
  const duplicateEvent = async (eventId: string): Promise<string | null> => {
    const source = allRules.find(r => r.id === eventId);
    if (!source) return null;

    const { id, created_at, updated_at, event_status, is_active, ...rest } = source;
    return createRules({
      ...rest,
      event_name: `${source.event_name || 'Evento'} (copia)`,
      event_status: 'draft',
      is_active: false,
      openmic_current_count: 0,
      dediche_current_count: 0,
      reopen_songs_used: 0,
      reopen_dediche_used: 0,
      reopen_active: false,
    });
  };

  // Delete an event
  const deleteEvent = async (eventId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('event_booking_rules')
        .delete()
        .eq('id', eventId);

      if (deleteError) throw deleteError;
      await fetchRules();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore eliminazione');
      return false;
    }
  };

  // Increment booking counters atomically
  const incrementOpenMicCount = async (): Promise<boolean> => {
    if (!rules?.id) return false;
    
    try {
      const { error: updateError } = await supabase
        .from('event_booking_rules')
        .update({ openmic_current_count: (rules.openmic_current_count || 0) + 1 })
        .eq('id', rules.id);
      
      if (updateError) throw updateError;
      return true;
    } catch {
      return false;
    }
  };

  const incrementDedicheCount = async (): Promise<boolean> => {
    if (!rules?.id) return false;
    
    try {
      const { error: updateError } = await supabase
        .from('event_booking_rules')
        .update({ dediche_current_count: (rules.dediche_current_count || 0) + 1 })
        .eq('id', rules.id);
      
      if (updateError) throw updateError;
      return true;
    } catch {
      return false;
    }
  };

  // Reset counters
  const resetCounters = async (): Promise<boolean> => {
    return updateRules({
      openmic_current_count: 0,
      dediche_current_count: 0,
      reopen_songs_used: 0,
      reopen_dediche_used: 0,
    });
  };

  // Sincronizza contatori con le prenotazioni reali
  const syncCounters = async (): Promise<boolean> => {
    if (!rules?.id) return false;
    
    try {
      // Count actual active reservations
      const { count: songsCount, error: songsError } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress')
        .or('dedication_message.is.null,dedication_message.eq.');
      
      const { count: dedicheCount, error: dedicheError } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress')
        .not('dedication_message', 'is', null)
        .neq('dedication_message', '');
      
      if (songsError || dedicheError) {
        console.error('[syncCounters] Error counting reservations:', songsError || dedicheError);
        return false;
      }
      
      return updateRules({
        openmic_current_count: songsCount || 0,
        dediche_current_count: dedicheCount || 0,
      });
    } catch (error) {
      console.error('[syncCounters] Error:', error);
      return false;
    }
  };

  // Start extraordinary reopening
  const startReopen = async (mode: 'time' | 'songs' | 'dediche' | 'combo', value: number, message?: string, extraDediche?: number): Promise<boolean> => {
    const updates: Partial<EventBookingRules> = {
      reopen_active: true,
      reopen_mode: mode,
      reopen_message: message || null,
      reopen_songs_used: 0,
      reopen_dediche_used: 0,
    };

    if (mode === 'time') {
      updates.reopen_until = new Date(Date.now() + value * 60 * 1000).toISOString();
    } else if (mode === 'songs') {
      updates.reopen_extra_songs = value;
    } else if (mode === 'dediche') {
      updates.reopen_extra_dediche = value;
    } else if (mode === 'combo') {
      updates.reopen_extra_songs = value;
      updates.reopen_extra_dediche = extraDediche || 0;
    }

    return updateRules(updates);
  };

  // Stop reopening
  const stopReopen = async (): Promise<boolean> => {
    return updateRules({
      reopen_active: false,
      reopen_until: null,
      reopen_mode: null,
      reopen_extra_songs: null,
      reopen_extra_dediche: null,
      reopen_message: null,
    });
  };

  return {
    rules,
    liveEvent,
    allRules,
    loading,
    error,
    updateRules,
    selectEvent,
    toggleActive,
    setEventStatus,
    goLive,
    closeEvent,
    updatePin,
    generatePin,
    createRules,
    duplicateEvent,
    deleteEvent,
    incrementOpenMicCount,
    incrementDedicheCount,
    resetCounters,
    syncCounters,
    startReopen,
    stopReopen,
    refetch: fetchRules,
  };
};

// Hook pubblico per ottenere solo l'evento live (per il frontend utente)
export const useLiveEvent = () => {
  const [liveEvent, setLiveEvent] = useState<EventBookingRules | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLive = async () => {
      const { data, error } = await supabase
        .from('event_booking_rules')
        .select('*')
        .eq('event_status', 'live')
        .maybeSingle();

      if (!error && data) {
        setLiveEvent(normalizeEventRules(data));
      } else {
        setLiveEvent(null);
      }
      setLoading(false);
    };

    fetchLive();

    // Realtime
    const channel = supabase
      .channel(`live-event-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_booking_rules',
        },
        () => fetchLive()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { liveEvent, loading };
};
