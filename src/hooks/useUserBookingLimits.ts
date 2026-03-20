import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserBookingLimits {
  // Configuration from event settings
  enabled: boolean;
  mode: 'session' | 'session_name';
  songsTotalLimit: number | null;
  dedicheTotalLimit: number | null;
  songsIntervalLimit: number | null;
  intervalMinutes: number | null;
  consecutiveSongsLimit: number | null;
  cooldownMessage: string;
  
  // Current counts for this user
  currentSongsCount: number;
  currentDedicheCount: number;
  currentConsecutive: number;
  firstBookingAt: string | null;
  lastBookingAt: string | null;
  
  // Computed states
  canBookSong: boolean;
  canBookDedica: boolean;
  blockedReason: string | null;
  cooldownEndsAt: Date | null;
}

interface UserBookingLimitsOptions {
  eventId: string | null;
  sessionFingerprint: string;
  customerName?: string;
}

/**
 * Hook per verificare e gestire i limiti di prenotazione per utente.
 * 
 * Supporta tre tipi di limite:
 * 1. Limite totale per evento - Max X canzoni per tutta la serata
 * 2. Limite consecutivo - Max X canzoni se non ci sono altre prenotazioni nel mezzo
 * 3. Limite temporale - Max X canzoni ogni Y minuti
 */
export const useUserBookingLimits = ({ 
  eventId, 
  sessionFingerprint, 
  customerName 
}: UserBookingLimitsOptions) => {
  const [limits, setLimits] = useState<UserBookingLimits>({
    enabled: false,
    mode: 'session',
    songsTotalLimit: null,
    dedicheTotalLimit: null,
    songsIntervalLimit: null,
    intervalMinutes: null,
    consecutiveSongsLimit: null,
    cooldownMessage: '',
    currentSongsCount: 0,
    currentDedicheCount: 0,
    currentConsecutive: 0,
    firstBookingAt: null,
    lastBookingAt: null,
    canBookSong: true,
    canBookDedica: true,
    blockedReason: null,
    cooldownEndsAt: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchLimits = useCallback(async () => {
    if (!eventId || !sessionFingerprint) {
      setLoading(false);
      return;
    }

    try {
      // Fetch event settings (try free_mode_settings first, then event_booking_rules)
      const { data: freeModeData } = await supabase
        .from('free_mode_settings')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      const settings = freeModeData;
      
      if (!settings || !settings.user_limit_enabled) {
        setLimits(prev => ({
          ...prev,
          enabled: false,
          canBookSong: true,
          canBookDedica: true,
          blockedReason: null,
        }));
        setLoading(false);
        return;
      }

      // Fetch user's current booking counts
      const { data: bookingData } = await supabase
        .from('user_booking_counts')
        .select('*')
        .eq('event_id', eventId)
        .eq('session_fingerprint', sessionFingerprint)
        .maybeSingle();

      const mode = (settings.user_limit_mode || 'session') as 'session' | 'session_name';
      
      // Read individual enable flags
      const totalEnabled = settings.user_limit_total_enabled ?? false;
      const consecutiveEnabled = settings.user_limit_consecutive_enabled ?? false;
      const intervalEnabled = settings.user_limit_interval_enabled ?? false;
      
      const songsTotalLimit = totalEnabled ? settings.user_limit_songs_total : null;
      const dedicheTotalLimit = totalEnabled ? settings.user_limit_dediche_total : null;
      const songsIntervalLimit = intervalEnabled ? settings.user_limit_songs_interval : null;
      const intervalMinutes = intervalEnabled ? settings.user_limit_interval_minutes : null;
      const consecutiveSongsLimit = consecutiveEnabled ? settings.user_limit_consecutive_songs : null;
      const cooldownMessage = settings.user_limit_cooldown_message || 
        'Hai superato il limite di prenotazioni.';

      const currentSongsCount = bookingData?.songs_count || 0;
      const currentDedicheCount = bookingData?.dediche_count || 0;
      const currentConsecutive = bookingData?.consecutive_songs || 0;
      const lastBookingAt = bookingData?.last_booking_at || null;

      // Calculate blocks
      let canBookSong = true;
      let canBookDedica = true;
      let blockedReason: string | null = null;
      let cooldownEndsAt: Date | null = null;

      // Check total limit (only if totalEnabled)
      if (songsTotalLimit && currentSongsCount >= songsTotalLimit) {
        canBookSong = false;
        blockedReason = `Hai raggiunto il limite di ${songsTotalLimit} canzoni per questa serata.`;
      }

      if (dedicheTotalLimit && currentDedicheCount >= dedicheTotalLimit) {
        canBookDedica = false;
        if (!blockedReason) {
          blockedReason = `Hai raggiunto il limite di ${dedicheTotalLimit} dediche per questa serata.`;
        }
      }

      // Check consecutive limit (only if consecutiveEnabled)
      if (canBookSong && consecutiveSongsLimit && currentConsecutive >= consecutiveSongsLimit) {
        canBookSong = false;
        blockedReason = `Hai prenotato ${consecutiveSongsLimit} canzoni consecutive. Lascia spazio agli altri!`;
      }

      // Check interval limit
      if (canBookSong && songsIntervalLimit && intervalMinutes && lastBookingAt) {
        const lastBooking = new Date(lastBookingAt);
        const intervalEnd = new Date(lastBooking.getTime() + intervalMinutes * 60 * 1000);
        
        if (new Date() < intervalEnd) {
          // Still in cooldown period - check if limit reached
          // Need to count bookings in the last X minutes
          const windowStart = new Date(Date.now() - intervalMinutes * 60 * 1000);
          
          // For simplicity, we'll use the current count vs interval limit
          // A more accurate implementation would query reservations within the window
          if (currentSongsCount > 0 && (currentSongsCount % songsIntervalLimit) === 0) {
            canBookSong = false;
            cooldownEndsAt = intervalEnd;
            const minutesRemaining = Math.ceil((intervalEnd.getTime() - Date.now()) / 60000);
            blockedReason = cooldownMessage.replace('{minutes}', minutesRemaining.toString());
          }
        }
      }

      setLimits({
        enabled: true,
        mode,
        songsTotalLimit,
        dedicheTotalLimit,
        songsIntervalLimit,
        intervalMinutes,
        consecutiveSongsLimit,
        cooldownMessage,
        currentSongsCount,
        currentDedicheCount,
        currentConsecutive,
        firstBookingAt: bookingData?.first_booking_at || null,
        lastBookingAt,
        canBookSong,
        canBookDedica,
        blockedReason,
        cooldownEndsAt,
      });
    } catch (error) {
      console.error('[UserBookingLimits] Error fetching limits:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId, sessionFingerprint, customerName]);

  useEffect(() => {
    fetchLimits();

    // Subscribe to changes
    const channel = supabase
      .channel(`user-booking-limits-${sessionFingerprint}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_booking_counts',
        },
        () => fetchLimits()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'free_mode_settings',
        },
        () => fetchLimits()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLimits, sessionFingerprint]);

  // Summary text for UI
  const limitsSummary = useMemo(() => {
    if (!limits.enabled) return null;

    const parts: string[] = [];
    
    if (limits.songsTotalLimit) {
      parts.push(`${limits.currentSongsCount}/${limits.songsTotalLimit} canzoni`);
    }
    if (limits.dedicheTotalLimit) {
      parts.push(`${limits.currentDedicheCount}/${limits.dedicheTotalLimit} dediche`);
    }
    if (limits.consecutiveSongsLimit) {
      parts.push(`${limits.currentConsecutive}/${limits.consecutiveSongsLimit} consecutive`);
    }

    return parts.length > 0 ? parts.join(' • ') : null;
  }, [limits]);

  return {
    limits,
    loading,
    refetch: fetchLimits,
    limitsSummary,
  };
};

/**
 * Funzione helper per generare fingerprint sessione
 */
export const getSessionFingerprint = (): string => {
  // Check localStorage for existing fingerprint
  const stored = localStorage.getItem('session_fingerprint');
  if (stored) return stored;

  // Generate new fingerprint
  const fingerprint = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  localStorage.setItem('session_fingerprint', fingerprint);
  return fingerprint;
};
