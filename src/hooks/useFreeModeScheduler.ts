import { useEffect, useRef, useCallback, useState } from 'react';
import { useFreeModeSettings } from './useFreeModeSettings';

/**
 * Hook che gestisce l'avvio automatico e la chiusura automatica degli eventi liberi
 * basato sulle impostazioni di timing (start_mode, end_mode)
 */
export const useFreeModeScheduler = () => {
  const { 
    settings, 
    activateFreeMode, 
    deactivateFreeMode, 
    loading 
  } = useFreeModeSettings();
  
  const autoStartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // State per countdown in tempo reale (secondi)
  const [secondsUntilStart, setSecondsUntilStart] = useState<number | null>(null);
  const [secondsUntilEnd, setSecondsUntilEnd] = useState<number | null>(null);

  // Calcola la data/ora di partenza programmata
  const getScheduledStartTime = useCallback((): Date | null => {
    if (!settings || settings.start_mode !== 'scheduled') return null;
    if (!settings.event_date || !settings.event_start_time) return null;
    
    const dateTimeStr = `${settings.event_date}T${settings.event_start_time}`;
    const scheduledTime = new Date(dateTimeStr);
    
    return isNaN(scheduledTime.getTime()) ? null : scheduledTime;
  }, [settings]);

  // Calcola la data/ora di fine evento
  const getScheduledEndTime = useCallback((): Date | null => {
    if (!settings) return null;
    
    // Se c'è expires_at, usalo
    if (settings.expires_at) {
      const expiresAt = new Date(settings.expires_at);
      return isNaN(expiresAt.getTime()) ? null : expiresAt;
    }
    
    return null;
  }, [settings]);

  // Genera ISO string per il target time
  const getScheduledStartTimeISO = useCallback((): string | null => {
    const time = getScheduledStartTime();
    return time ? time.toISOString() : null;
  }, [getScheduledStartTime]);

  const getScheduledEndTimeISO = useCallback((): string | null => {
    const time = getScheduledEndTime();
    return time ? time.toISOString() : null;
  }, [getScheduledEndTime]);

  // Pulisci tutti i timeout
  const clearAllTimeouts = useCallback(() => {
    if (autoStartTimeoutRef.current) {
      clearTimeout(autoStartTimeoutRef.current);
      autoStartTimeoutRef.current = null;
    }
    if (autoEndTimeoutRef.current) {
      clearTimeout(autoEndTimeoutRef.current);
      autoEndTimeoutRef.current = null;
    }
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
  }, []);

  // Aggiorna countdown ogni secondo
  useEffect(() => {
    const updateCountdowns = () => {
      const startTime = getScheduledStartTime();
      const endTime = getScheduledEndTime();
      const now = Date.now();
      
      if (startTime && !settings?.is_active) {
        const remaining = Math.max(0, Math.ceil((startTime.getTime() - now) / 1000));
        setSecondsUntilStart(remaining);
      } else {
        setSecondsUntilStart(null);
      }
      
      if (endTime && settings?.is_active) {
        const remaining = Math.max(0, Math.ceil((endTime.getTime() - now) / 1000));
        setSecondsUntilEnd(remaining);
      } else {
        setSecondsUntilEnd(null);
      }
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, [settings, getScheduledStartTime, getScheduledEndTime]);

  // Gestisci avvio automatico
  useEffect(() => {
    if (loading || !settings) return;
    
    // Se l'evento è già attivo, non serve controllare l'avvio
    if (settings.is_active) return;
    
    // Se non è in modalità scheduled, non fare nulla
    if (settings.start_mode !== 'scheduled') return;
    
    const scheduledStart = getScheduledStartTime();
    if (!scheduledStart) return;
    
    const now = new Date();
    const msUntilStart = scheduledStart.getTime() - now.getTime();
    
    // Se la data è già passata, attiva subito
    if (msUntilStart <= 0) {
      console.log('[FreeModeScheduler] Scheduled start time passed, activating...');
      activateFreeMode();
      return;
    }
    
    // Altrimenti, programma l'attivazione
    console.log(`[FreeModeScheduler] Scheduling auto-start in ${Math.round(msUntilStart / 1000 / 60)} minutes`);
    
    // Limita a max 24 ore per evitare overflow
    const safeDelay = Math.min(msUntilStart, 24 * 60 * 60 * 1000);
    
    autoStartTimeoutRef.current = setTimeout(() => {
      console.log('[FreeModeScheduler] Auto-starting event...');
      activateFreeMode();
    }, safeDelay);
    
    return () => {
      if (autoStartTimeoutRef.current) {
        clearTimeout(autoStartTimeoutRef.current);
        autoStartTimeoutRef.current = null;
      }
    };
  }, [loading, settings, getScheduledStartTime, activateFreeMode]);

  // Gestisci chiusura automatica
  useEffect(() => {
    if (loading || !settings) return;
    
    // Se l'evento non è attivo, non serve controllare la chiusura
    if (!settings.is_active) return;
    
    // Se end_mode è manual, non fare nulla
    if (settings.end_mode === 'manual') return;
    
    const scheduledEnd = getScheduledEndTime();
    if (!scheduledEnd) return;
    
    const now = new Date();
    const msUntilEnd = scheduledEnd.getTime() - now.getTime();
    
    // Se la data è già passata, chiudi subito
    if (msUntilEnd <= 0) {
      console.log('[FreeModeScheduler] Scheduled end time passed, deactivating...');
      deactivateFreeMode();
      return;
    }
    
    // Altrimenti, programma la chiusura
    console.log(`[FreeModeScheduler] Scheduling auto-end in ${Math.round(msUntilEnd / 1000 / 60)} minutes`);
    
    // Limita a max 24 ore per evitare overflow
    const safeDelay = Math.min(msUntilEnd, 24 * 60 * 60 * 1000);
    
    autoEndTimeoutRef.current = setTimeout(() => {
      console.log('[FreeModeScheduler] Auto-ending event...');
      deactivateFreeMode();
    }, safeDelay);
    
    return () => {
      if (autoEndTimeoutRef.current) {
        clearTimeout(autoEndTimeoutRef.current);
        autoEndTimeoutRef.current = null;
      }
    };
  }, [loading, settings, getScheduledEndTime, deactivateFreeMode]);

  // Cleanup on unmount
  useEffect(() => {
    return clearAllTimeouts;
  }, [clearAllTimeouts]);

  // Helper per calcolare tempo rimanente alla partenza (minuti)
  const getTimeUntilStart = (): number | null => {
    const startTime = getScheduledStartTime();
    if (!startTime) return null;
    
    const remaining = startTime.getTime() - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
  };

  // Helper per calcolare tempo rimanente alla fine (minuti)
  const getTimeUntilEnd = (): number | null => {
    const endTime = getScheduledEndTime();
    if (!endTime) return null;
    
    const remaining = endTime.getTime() - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
  };

  return {
    isScheduledStart: settings?.start_mode === 'scheduled',
    isScheduledEnd: settings?.end_mode !== 'manual',
    scheduledStartTime: getScheduledStartTime(),
    scheduledEndTime: getScheduledEndTime(),
    scheduledStartTimeISO: getScheduledStartTimeISO(),
    scheduledEndTimeISO: getScheduledEndTimeISO(),
    timeUntilStart: getTimeUntilStart(),
    timeUntilEnd: getTimeUntilEnd(),
    secondsUntilStart,
    secondsUntilEnd,
    // Config per countdown
    countdownStartShowMinutes: settings?.countdown_start_show_minutes ?? 10,
    countdownEndShowMinutes: settings?.countdown_end_show_minutes ?? 10,
  };
};
