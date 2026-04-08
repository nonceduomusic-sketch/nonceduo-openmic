import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FreeModeSettings {
  id: string;
  event_name: string;
  event_status: string;
  openmic_enabled: boolean;
  dediche_enabled: boolean;
  voting_enabled: boolean;
  openmic_max_songs: number | null;
  dediche_max_total: number | null;
  duration_minutes: number | null;
  started_at: string | null;
  expires_at: string | null;
  openmic_current_count: number;
  dediche_current_count: number;
  pin_enabled: boolean;
  pin_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Event timing
  event_date: string | null;
  event_start_time: string | null;
  event_end_date: string | null;
  event_end_time: string | null;
  start_mode: 'manual' | 'scheduled';
  end_mode: 'manual' | 'scheduled' | 'duration';
  // Booking window
  booking_opens_at: string | null;
  booking_closes_at: string | null;
  close_minutes_before_end: number | null;
  // Final limit (urgency mode) - Open Mic
  openmic_final_limit_enabled: boolean;
  openmic_final_limit_songs: number | null;
  openmic_final_limit_minutes: number | null;
  // Final limit (urgency mode) - Dediche
  dediche_final_limit_enabled: boolean;
  dediche_final_limit_total: number | null;
  dediche_final_limit_minutes: number | null;
  // Reopening
  reopen_active: boolean;
  reopen_until: string | null;
  reopen_extra_songs: number | null;
  reopen_extra_dediche: number | null;
  reopen_songs_used: number;
  reopen_dediche_used: number;
  reopen_message: string | null;
  reopen_mode: string | null;
  // Closure
  closure_mode: string;
  closure_title: string;
  closure_message: string;
  closure_redirect_url: string | null;
  closure_preview_enabled: boolean;
  // Countdown visibility config
  countdown_start_show_minutes: number | null;
  countdown_end_show_minutes: number | null;
  // User booking limits
  user_limit_enabled: boolean;
  user_limit_mode: 'session' | 'session_name';
  user_limit_songs_total: number | null;
  user_limit_dediche_total: number | null;
  user_limit_songs_interval: number | null;
  user_limit_interval_minutes: number | null;
  user_limit_consecutive_songs: number | null;
  user_limit_cooldown_message: string;
  // Consultable mode
  is_consultable_mode: boolean;
  protect_repertoire: boolean;
  // Catalog preview
  catalog_preview_enabled: boolean;
  catalog_preview_limit_type: 'percent' | 'count';
  catalog_preview_limit_value: number;
  catalog_preview_message: string;
}

export const useFreeModeSettings = () => {
  const [settings, setSettings] = useState<FreeModeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const computeProtectedFormats = useCallback((s: Pick<FreeModeSettings, 'openmic_enabled' | 'dediche_enabled'>) => {
    const formats: string[] = [];
    if (s.openmic_enabled !== false) formats.push('openmic');
    if (s.dediche_enabled !== false) formats.push('dediche');
    return formats;
  }, []);

  // Keep the active live_sessions row in sync with Free Mode PIN settings.
  // User-side PIN validation reads from live_sessions, so a mismatch here blocks entry.
  const syncActiveLiveSessionIfNeeded = useCallback(async (s: FreeModeSettings) => {
    if (!s.is_active) return;
    if (!s.pin_enabled || !s.pin_code) return;

    const desiredPin = s.pin_code.toUpperCase().trim();
    const desiredFormats = computeProtectedFormats(s);

    try {
      const { data: activeSession, error: activeError } = await supabase
        .from('live_sessions')
        .select('id, pin_code, protected_formats')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeError) {
        if (import.meta.env.DEV) console.warn('[FreeMode] sync live_sessions: read error', activeError);
      }

      if (!activeSession?.id) {
        await supabase
          .from('live_sessions')
          .insert({
            section: 'global',
            pin_code: desiredPin,
            protected_formats: desiredFormats,
            is_active: true,
          });
        return;
      }

      const currentPin = String(activeSession.pin_code || '').toUpperCase().trim();
      const currentFormats = (activeSession.protected_formats as string[]) || [];
      const formatsEqual =
        currentFormats.length === desiredFormats.length &&
        desiredFormats.every((f) => currentFormats.includes(f));

      if (currentPin !== desiredPin || !formatsEqual) {
        await supabase
          .from('live_sessions')
          .update({
            pin_code: desiredPin,
            protected_formats: desiredFormats,
          })
          .eq('id', activeSession.id);
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error('[FreeMode] sync live_sessions failed', e);
    }
  }, [computeProtectedFormats]);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('free_mode_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setSettings(data as FreeModeSettings);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    const channel = supabase
      .channel(`free-mode-settings-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'free_mode_settings',
        },
        () => fetchSettings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  // Auto-sync live session whenever Free Mode settings change while active.
  useEffect(() => {
    if (!settings) return;
    syncActiveLiveSessionIfNeeded(settings);
  }, [
    settings?.id,
    settings?.is_active,
    settings?.pin_enabled,
    settings?.pin_code,
    settings?.openmic_enabled,
    settings?.dediche_enabled,
    syncActiveLiveSessionIfNeeded,
  ]);

  const updateSettings = async (updates: Partial<FreeModeSettings>): Promise<boolean> => {
    if (!settings?.id) return false;

    try {
      const finalUpdates = { ...updates, updated_at: new Date().toISOString() };
      
      // Se cambiano i campi di timing durante un evento attivo, ricalcola expires_at
      if (settings.is_active && (
        updates.end_mode !== undefined || 
        updates.duration_minutes !== undefined ||
        updates.event_end_date !== undefined ||
        updates.event_end_time !== undefined
      )) {
        const newEndMode = (updates.end_mode ?? settings.end_mode) as 'manual' | 'scheduled' | 'duration';
        const newEventEndDate = updates.event_end_date ?? settings.event_end_date ?? settings.event_date;
        const newEventEndTime = updates.event_end_time ?? settings.event_end_time;
        const newDurationMinutes = updates.duration_minutes ?? settings.duration_minutes;
        const startedAt = settings.started_at ? new Date(settings.started_at) : new Date();
        
        // Ricalcola expires_at
        if (newEndMode === 'manual') {
          finalUpdates.expires_at = null;
        } else if (newEndMode === 'scheduled' && newEventEndDate && newEventEndTime) {
          const tp = newEventEndTime.length <= 5 ? `${newEventEndTime}:00` : newEventEndTime;
          finalUpdates.expires_at = `${newEventEndDate}T${tp}`;
        } else if (newEndMode === 'duration' && newDurationMinutes) {
          finalUpdates.expires_at = new Date(startedAt.getTime() + newDurationMinutes * 60 * 1000).toISOString();
        } else {
          finalUpdates.expires_at = null;
        }
      }
      
      const { error: updateError } = await supabase
        .from('free_mode_settings')
        .update(finalUpdates)
        .eq('id', settings.id);

      if (updateError) throw updateError;
      
      // Aggiorna lo stato locale immediatamente per una UI reattiva
      setSettings(prev => prev ? { ...prev, ...finalUpdates } : prev);
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore aggiornamento');
      return false;
    }
  };

  // Calcola expires_at in base a end_mode
  const calculateExpiresAt = (
    endMode: 'manual' | 'scheduled' | 'duration',
    eventEndDate: string | null,
    eventEndTime: string | null,
    durationMinutes: number | null,
    startedAt: Date = new Date()
  ): string | null => {
    if (endMode === 'scheduled' && eventEndDate && eventEndTime) {
      // Termine a orario specifico - eventEndTime può essere "HH:MM" o "HH:MM:SS"
      const timePart = eventEndTime.length <= 5 ? `${eventEndTime}:00` : eventEndTime;
      return `${eventEndDate}T${timePart}`;
    } else if (endMode === 'duration' && durationMinutes) {
      // Termine dopo X minuti dalla partenza
      return new Date(startedAt.getTime() + durationMinutes * 60 * 1000).toISOString();
    }
    // Manual: nessuna scadenza automatica
    return null;
  };

  // Attiva Free Mode
  const activateFreeMode = async (config?: {
    eventName?: string;
    openmic?: boolean;
    dediche?: boolean;
    voting?: boolean;
    durationMinutes?: number;
    maxSongs?: number;
    maxDediche?: number;
    pinCode?: string;
    bookingOpensAt?: string;
    bookingClosesAt?: string;
    closureMode?: string;
    closureTitle?: string;
    closureMessage?: string;
    closureRedirectUrl?: string;
  }): Promise<boolean> => {
    const now = new Date();
    
    // Recupera le impostazioni di timing correnti
    const endMode = settings?.end_mode || 'manual';
    const eventEndDate = settings?.event_end_date || settings?.event_date || null;
    const eventEndTime = settings?.event_end_time || null;
    
    const updates: Partial<FreeModeSettings> = {
      is_active: true,
      event_status: 'live',
      started_at: now.toISOString(),
      openmic_current_count: 0,
      dediche_current_count: 0,
      reopen_active: false,
      reopen_songs_used: 0,
      reopen_dediche_used: 0,
    };

    if (config?.eventName !== undefined) updates.event_name = config.eventName;
    if (config?.openmic !== undefined) updates.openmic_enabled = config.openmic;
    if (config?.dediche !== undefined) updates.dediche_enabled = config.dediche;
    if (config?.voting !== undefined) updates.voting_enabled = config.voting;
    if (config?.maxSongs !== undefined) updates.openmic_max_songs = config.maxSongs || null;
    if (config?.maxDediche !== undefined) updates.dediche_max_total = config.maxDediche || null;
    
    // Calcola expires_at in base a end_mode
    const durationMins = config?.durationMinutes ?? settings?.duration_minutes ?? null;
    updates.expires_at = calculateExpiresAt(endMode, eventEndDate, eventEndTime, durationMins, now);
    updates.duration_minutes = durationMins;

    if (config?.pinCode) {
      updates.pin_enabled = true;
      updates.pin_code = config.pinCode;
    } else {
      // PIN disabilitato di default all'avvio: sarà l'admin ad attivarlo manualmente
      updates.pin_enabled = false;
      updates.pin_code = null;
    }

    if (config?.bookingOpensAt) updates.booking_opens_at = config.bookingOpensAt;
    if (config?.bookingClosesAt) updates.booking_closes_at = config.bookingClosesAt;
    if (config?.closureMode) updates.closure_mode = config.closureMode;
    if (config?.closureTitle) updates.closure_title = config.closureTitle;
    if (config?.closureMessage) updates.closure_message = config.closureMessage;
    if (config?.closureRedirectUrl) updates.closure_redirect_url = config.closureRedirectUrl;

    const success = await updateSettings(updates);
    if (success) {
      // Se PIN abilitato, crea live_session per persistenza
      if (updates.pin_enabled && updates.pin_code) {
        const protectedFormats: string[] = [];
        if (updates.openmic_enabled !== false && (config?.openmic !== false)) {
          protectedFormats.push('openmic');
        }
        if (updates.dediche_enabled !== false && (config?.dediche !== false)) {
          protectedFormats.push('dediche');
        }

        // Disattiva eventuali live_sessions esistenti
        await supabase
          .from('live_sessions')
          .update({ is_active: false, deactivated_at: new Date().toISOString() })
          .eq('is_active', true);

        // Crea nuova live_session (section='global' per rispettare il constraint DB)
        await supabase
          .from('live_sessions')
          .insert({
            section: 'global',
            pin_code: updates.pin_code.toUpperCase().trim(),
            protected_formats: protectedFormats,
            is_active: true,
          });

        console.log('[activateFreeMode] Created live_session with PIN');
      }
      const name = (updates.event_name || settings?.event_name || 'EVENTO LIVE').trim();
      toast.success(`${name} attivato!`);
    }
    return success;
  };

  // Disattiva Free Mode
  const deactivateFreeMode = async (): Promise<boolean> => {
    const success = await updateSettings({
      is_active: false,
      event_status: 'closed',
      started_at: null,
      expires_at: null,
      reopen_active: false,
    });
    if (success) {
      // Disattiva live_session per invalidare tutti i PIN
      await supabase
        .from('live_sessions')
        .update({ is_active: false, deactivated_at: new Date().toISOString() })
        .eq('is_active', true);
      
      console.log('[deactivateFreeMode] Deactivated live_session - all PIN sessions invalidated');
      const name = (settings?.event_name || 'EVENTO LIVE').trim();
      toast.success(`${name} disattivato`);
    }
    return success;
  };

  // Attiva riapertura straordinaria
  const activateReopen = async (config: {
    mode: 'time' | 'count' | 'combo';
    minutes?: number;
    extraSongs?: number;
    extraDediche?: number;
    message?: string;
  }): Promise<boolean> => {
    const updates: Partial<FreeModeSettings> = {
      reopen_active: true,
      reopen_mode: config.mode,
      reopen_songs_used: 0,
      reopen_dediche_used: 0,
      reopen_message: config.message || null,
    };

    if (config.mode === 'time' || config.mode === 'combo') {
      if (config.minutes) {
        updates.reopen_until = new Date(Date.now() + config.minutes * 60 * 1000).toISOString();
      }
    }

    if (config.mode === 'count' || config.mode === 'combo') {
      updates.reopen_extra_songs = config.extraSongs || null;
      updates.reopen_extra_dediche = config.extraDediche || null;
    }

    const success = await updateSettings(updates);
    if (success) {
      toast.success('Riapertura straordinaria attivata!');
    }
    return success;
  };

  // Disattiva riapertura
  const deactivateReopen = async (): Promise<boolean> => {
    const success = await updateSettings({
      reopen_active: false,
      reopen_until: null,
      reopen_extra_songs: null,
      reopen_extra_dediche: null,
      reopen_message: null,
      reopen_mode: null,
    });
    if (success) {
      toast.success('Riapertura disattivata');
    }
    return success;
  };

  // Modifica impostazioni durante l'evento
  const updateLiveSettings = async (updates: {
    eventName?: string;
    openmic?: boolean;
    dediche?: boolean;
    voting?: boolean;
    maxSongs?: number | null;
    maxDediche?: number | null;
    durationMinutes?: number | null;
    pinCode?: string | null;
    pinEnabled?: boolean;
    closureMode?: string;
    closureTitle?: string;
    closureMessage?: string;
    closureRedirectUrl?: string | null;
    bookingOpensAt?: string | null;
    bookingClosesAt?: string | null;
    closeMinutesBeforeEnd?: number | null;
    openmicFinalLimitEnabled?: boolean;
    openmicFinalLimitSongs?: number | null;
    openmicFinalLimitMinutes?: number | null;
  }): Promise<boolean> => {
    const dbUpdates: Partial<FreeModeSettings> = {};
    
    if (updates.eventName !== undefined) dbUpdates.event_name = updates.eventName;
    if (updates.openmic !== undefined) dbUpdates.openmic_enabled = updates.openmic;
    if (updates.dediche !== undefined) dbUpdates.dediche_enabled = updates.dediche;
    if (updates.voting !== undefined) dbUpdates.voting_enabled = updates.voting;
    if (updates.maxSongs !== undefined) dbUpdates.openmic_max_songs = updates.maxSongs;
    if (updates.maxDediche !== undefined) dbUpdates.dediche_max_total = updates.maxDediche;
    
    if (updates.durationMinutes !== undefined) {
      if (updates.durationMinutes && updates.durationMinutes > 0) {
        dbUpdates.duration_minutes = updates.durationMinutes;
        dbUpdates.expires_at = new Date(Date.now() + updates.durationMinutes * 60 * 1000).toISOString();
      } else {
        dbUpdates.duration_minutes = null;
        dbUpdates.expires_at = null;
      }
    }
    
    if (updates.pinCode !== undefined) {
      if (updates.pinCode) {
        dbUpdates.pin_enabled = true;
        dbUpdates.pin_code = updates.pinCode;
      } else {
        dbUpdates.pin_enabled = false;
        dbUpdates.pin_code = null;
      }
    }

    if (updates.pinEnabled !== undefined) dbUpdates.pin_enabled = updates.pinEnabled;
    if (updates.closureMode !== undefined) dbUpdates.closure_mode = updates.closureMode;
    if (updates.closureTitle !== undefined) dbUpdates.closure_title = updates.closureTitle;
    if (updates.closureMessage !== undefined) dbUpdates.closure_message = updates.closureMessage;
    if (updates.closureRedirectUrl !== undefined) dbUpdates.closure_redirect_url = updates.closureRedirectUrl;
    if (updates.bookingOpensAt !== undefined) dbUpdates.booking_opens_at = updates.bookingOpensAt;
    if (updates.bookingClosesAt !== undefined) dbUpdates.booking_closes_at = updates.bookingClosesAt;
    if (updates.closeMinutesBeforeEnd !== undefined) dbUpdates.close_minutes_before_end = updates.closeMinutesBeforeEnd;
    if (updates.openmicFinalLimitEnabled !== undefined) dbUpdates.openmic_final_limit_enabled = updates.openmicFinalLimitEnabled;
    if (updates.openmicFinalLimitSongs !== undefined) dbUpdates.openmic_final_limit_songs = updates.openmicFinalLimitSongs;
    if (updates.openmicFinalLimitMinutes !== undefined) dbUpdates.openmic_final_limit_minutes = updates.openmicFinalLimitMinutes;

    const success = await updateSettings(dbUpdates);
    if (success) {
      toast.success('Impostazioni aggiornate');
    }
    return success;
  };

  // Incrementa contatori
  const incrementOpenMicCount = async (): Promise<boolean> => {
    if (!settings?.id) return false;
    return updateSettings({ openmic_current_count: (settings.openmic_current_count || 0) + 1 });
  };

  const incrementDedicheCount = async (): Promise<boolean> => {
    if (!settings?.id) return false;
    return updateSettings({ dediche_current_count: (settings.dediche_current_count || 0) + 1 });
  };

  // Reset contatori
  const resetCounters = async (): Promise<boolean> => {
    return updateSettings({
      openmic_current_count: 0,
      dediche_current_count: 0,
      reopen_songs_used: 0,
      reopen_dediche_used: 0,
    });
  };

  // Sincronizza contatori con le prenotazioni reali
  const syncCounters = async (): Promise<boolean> => {
    if (!settings?.id) return false;
    
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
      
      return updateSettings({
        openmic_current_count: songsCount || 0,
        dediche_current_count: dedicheCount || 0,
      });
    } catch (error) {
      console.error('[syncCounters] Error:', error);
      return false;
    }
  };

  // Genera PIN
  const generatePin = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  // Check limiti
  const canBookOpenMic = (): boolean => {
    if (!settings?.is_active || !settings?.openmic_enabled) return false;
    if (settings.openmic_max_songs && settings.openmic_current_count >= settings.openmic_max_songs) return false;
    if (settings.expires_at && new Date(settings.expires_at) < new Date()) return false;
    return true;
  };

  const canBookDediche = (): boolean => {
    if (!settings?.is_active || !settings?.dediche_enabled) return false;
    if (settings.dediche_max_total && settings.dediche_current_count >= settings.dediche_max_total) return false;
    if (settings.expires_at && new Date(settings.expires_at) < new Date()) return false;
    return true;
  };

  // Time remaining
  const getTimeRemaining = (): number | null => {
    if (!settings?.expires_at) return null;
    const remaining = new Date(settings.expires_at).getTime() - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
  };

  // Reopen time remaining
  const getReopenTimeRemaining = (): number | null => {
    if (!settings?.reopen_until) return null;
    const remaining = new Date(settings.reopen_until).getTime() - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    activateFreeMode,
    deactivateFreeMode,
    activateReopen,
    deactivateReopen,
    updateLiveSettings,
    incrementOpenMicCount,
    incrementDedicheCount,
    resetCounters,
    syncCounters,
    generatePin,
    canBookOpenMic,
    canBookDediche,
    getTimeRemaining,
    getReopenTimeRemaining,
    refetch: fetchSettings,
  };
};

// Hook pubblico per controllare lo stato Free Mode
export const useFreeModeActive = () => {
  const [isActive, setIsActive] = useState(false);
  const [settings, setSettings] = useState<FreeModeSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('free_mode_settings')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (data) {
        // Check expiration
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setIsActive(false);
        } else {
          setIsActive(true);
          setSettings(data as FreeModeSettings);
        }
      } else {
        setIsActive(false);
      }
      setLoading(false);
    };

    fetch();

    const channel = supabase
      .channel(`free-mode-active-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'free_mode_settings',
        },
        () => fetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { isActive, settings, loading };
};
