import React, { useState, useEffect, useMemo } from 'react';
import { Clock, AlertTriangle, Music, Heart, RefreshCw, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveEvent } from '@/hooks/useLiveEvent';
import { differenceInSeconds, differenceInMinutes, parseISO, format } from 'date-fns';
import { it } from 'date-fns/locale';

interface BookingStatusBannerProps {
  event: LiveEvent;
  currentOpenMicCount?: number;
  currentDedicheCount?: number;
  format?: 'openmic' | 'dediche' | 'both';
  className?: string;
}

/**
 * BookingStatusBanner - Mostra stato prenotazioni, countdown e posti rimanenti
 * 
 * Features:
 * - Countdown alla chiusura (booking_closes_at o orario evento)
 * - Posti rimanenti (max - current)
 * - Riapertura straordinaria con messaggio
 * - Alert urgenza (ultimi minuti/posti)
 */
export const BookingStatusBanner: React.FC<BookingStatusBannerProps> = ({
  event,
  currentOpenMicCount = 0,
  currentDedicheCount = 0,
  format = 'both',
  className,
}) => {
  const [now, setNow] = useState(new Date());

  // Update every second for countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate remaining slots
  const openMicRemaining = useMemo(() => {
    if (!event.openmic_enabled || !event.openmic_max_songs) return null;
    return Math.max(0, event.openmic_max_songs - currentOpenMicCount);
  }, [event.openmic_enabled, event.openmic_max_songs, currentOpenMicCount]);

  const dedicheRemaining = useMemo(() => {
    if (!event.dediche_enabled || !event.dediche_max_total) return null;
    return Math.max(0, event.dediche_max_total - currentDedicheCount);
  }, [event.dediche_enabled, event.dediche_max_total, currentDedicheCount]);

  // Calculate countdown
  const countdown = useMemo(() => {
    let closingTime: Date | null = null;

    // Priority: booking_closes_at > event end time
    if (event.booking_closes_at) {
      closingTime = parseISO(event.booking_closes_at);
    } else if (event.event_date && event.event_end_time) {
      const endDateTime = `${event.event_date}T${event.event_end_time}`;
      closingTime = parseISO(endDateTime);
      
      // Apply close_minutes_before_end if set
      if (event.close_minutes_before_end) {
        closingTime = new Date(closingTime.getTime() - event.close_minutes_before_end * 60 * 1000);
      }
    }

    if (!closingTime) return null;

    const seconds = differenceInSeconds(closingTime, now);
    if (seconds <= 0) return { expired: true, text: 'Chiuse', urgent: true };

    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;

    let text = '';
    if (hours > 0) {
      text = `${hours}h ${remainingMinutes}m`;
    } else if (minutes > 0) {
      text = `${minutes}m ${remainingSeconds}s`;
    } else {
      text = `${seconds}s`;
    }

    return {
      expired: false,
      text,
      urgent: minutes < 5,
      warning: minutes < 15,
    };
  }, [event, now]);

  // Reopen status
  const reopenInfo = useMemo(() => {
    if (!event.reopen_active || !event.reopen_until) return null;
    
    const reopenUntil = parseISO(event.reopen_until);
    const seconds = differenceInSeconds(reopenUntil, now);
    
    if (seconds <= 0) return null;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return {
      message: event.reopen_message || 'Riapertura straordinaria!',
      timeLeft: minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`,
      extraSongs: event.reopen_extra_songs,
      extraDediche: event.reopen_extra_dediche,
    };
  }, [event, now]);

  // Determine urgency level
  const isUrgent = countdown?.urgent || 
    (openMicRemaining !== null && openMicRemaining <= 3) ||
    (dedicheRemaining !== null && dedicheRemaining <= 3);

  const isWarning = countdown?.warning ||
    (openMicRemaining !== null && openMicRemaining <= 5) ||
    (dedicheRemaining !== null && dedicheRemaining <= 5);

  // Don't show if closed
  if (countdown?.expired && !reopenInfo) {
    return (
      <div className={cn(
        "p-3 rounded-lg border bg-destructive/10 border-destructive/30",
        className
      )}>
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">Prenotazioni chiuse</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "p-3 rounded-lg border transition-all",
      reopenInfo 
        ? "bg-secondary/10 border-secondary/30 animate-pulse-subtle" 
        : isUrgent 
          ? "bg-destructive/10 border-destructive/30" 
          : isWarning 
            ? "bg-warning/10 border-warning/30"
            : "bg-accent/10 border-accent/30",
      className
    )}>
      {/* Reopen banner */}
      {reopenInfo && (
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-secondary/20">
          <RefreshCw className="w-4 h-4 text-secondary animate-spin" style={{ animationDuration: '3s' }} />
          <span className="text-sm font-medium text-secondary">{reopenInfo.message}</span>
          <span className="text-xs text-secondary/80 ml-auto">
            ⏱️ {reopenInfo.timeLeft}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        {/* Countdown */}
        {countdown && !countdown.expired && (
          <div className={cn(
            "flex items-center gap-1.5",
            countdown.urgent ? "text-destructive" : countdown.warning ? "text-warning" : "text-accent"
          )}>
            <Clock className="w-4 h-4" />
            <span className="font-medium">{countdown.text}</span>
          </div>
        )}

        {/* Open Mic remaining */}
        {(format === 'openmic' || format === 'both') && openMicRemaining !== null && (
          <div className={cn(
            "flex items-center gap-1.5",
            openMicRemaining <= 3 ? "text-destructive" : openMicRemaining <= 5 ? "text-warning" : "text-muted-foreground"
          )}>
            <Music className="w-4 h-4" />
            <span>
              {openMicRemaining === 0 ? (
                <span className="font-medium">Esaurite</span>
              ) : (
                <>
                  <span className="font-medium">{openMicRemaining}</span>
                  <span className="text-xs ml-1">
                    {openMicRemaining === 1 ? 'posto' : 'posti'}
                  </span>
                </>
              )}
            </span>
          </div>
        )}

        {/* Dediche remaining */}
        {(format === 'dediche' || format === 'both') && dedicheRemaining !== null && (
          <div className={cn(
            "flex items-center gap-1.5",
            dedicheRemaining <= 3 ? "text-destructive" : dedicheRemaining <= 5 ? "text-warning" : "text-muted-foreground"
          )}>
            <Heart className="w-4 h-4" />
            <span>
              {dedicheRemaining === 0 ? (
                <span className="font-medium">Esaurite</span>
              ) : (
                <>
                  <span className="font-medium">{dedicheRemaining}</span>
                  <span className="text-xs ml-1">
                    {dedicheRemaining === 1 ? 'dedica' : 'dediche'}
                  </span>
                </>
              )}
            </span>
          </div>
        )}

        {/* Reopen extras */}
        {reopenInfo && (
          <div className="flex items-center gap-2 ml-auto text-xs text-secondary">
            {reopenInfo.extraSongs && (
              <span>+{reopenInfo.extraSongs} canzoni</span>
            )}
            {reopenInfo.extraDediche && (
              <span>+{reopenInfo.extraDediche} dediche</span>
            )}
          </div>
        )}
      </div>

      {/* Urgency message */}
      {isUrgent && !reopenInfo && (
        <p className="text-xs text-destructive mt-2 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Affrettati! Ultimi posti disponibili
        </p>
      )}
    </div>
  );
};
