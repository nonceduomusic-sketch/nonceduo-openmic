import React, { useState, useEffect, useMemo } from 'react';
import { Clock, AlertTriangle, Music, Heart, RefreshCw, CheckCircle, Flame, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveEvent } from '@/hooks/useLiveEvent';
import { differenceInSeconds, differenceInMinutes, parseISO } from 'date-fns';

interface BookingStatusBannerProps {
  event: LiveEvent;
  currentOpenMicCount?: number;
  currentDedicheCount?: number;
  format?: 'openmic' | 'dediche' | 'both';
  className?: string;
}

type UrgencyLevel = 'safe' | 'warning' | 'urgent' | 'critical';

const getUrgencyColors = (level: UrgencyLevel) => {
  switch (level) {
    case 'safe':
      return {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-500',
        icon: 'text-emerald-500',
        badge: 'bg-emerald-500/20 text-emerald-500',
        glow: 'shadow-emerald-500/20',
      };
    case 'warning':
      return {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-500',
        icon: 'text-yellow-500',
        badge: 'bg-yellow-500/20 text-yellow-500',
        glow: 'shadow-yellow-500/20',
      };
    case 'urgent':
      return {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        text: 'text-orange-500',
        icon: 'text-orange-500',
        badge: 'bg-orange-500/20 text-orange-500',
        glow: 'shadow-orange-500/20',
      };
    case 'critical':
      return {
        bg: 'bg-destructive/10',
        border: 'border-destructive/30',
        text: 'text-destructive',
        icon: 'text-destructive',
        badge: 'bg-destructive/20 text-destructive',
        glow: 'shadow-destructive/20',
      };
  }
};

/**
 * BookingStatusBanner - Mostra stato prenotazioni, countdown e posti rimanenti
 * 
 * Features:
 * - Countdown alla chiusura con colori dinamici (verde → giallo → arancione → rosso)
 * - Posti rimanenti con indicatori visivi
 * - Riapertura straordinaria con messaggio
 * - Alert urgenza (ultimi minuti/posti)
 * - Progress bar animata
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

  // Calculate slot urgency
  const getSlotUrgency = (remaining: number | null, max: number | null): UrgencyLevel => {
    if (remaining === null || max === null) return 'safe';
    if (remaining === 0) return 'critical';
    if (remaining <= 3) return 'critical';
    if (remaining <= 5) return 'urgent';
    if (remaining <= Math.ceil(max * 0.25)) return 'warning';
    return 'safe';
  };

  const openMicUrgency = getSlotUrgency(openMicRemaining, event.openmic_max_songs);
  const dedicheUrgency = getSlotUrgency(dedicheRemaining, event.dediche_max_total);

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
    if (seconds <= 0) return { expired: true, text: 'Chiuse', urgency: 'critical' as UrgencyLevel, seconds: 0, percentage: 0 };

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

    // Determine urgency based on time
    let urgency: UrgencyLevel = 'safe';
    if (minutes < 5) urgency = 'critical';
    else if (minutes < 15) urgency = 'urgent';
    else if (minutes < 30) urgency = 'warning';

    return {
      expired: false,
      text,
      urgency,
      seconds,
      minutes,
      percentage: Math.min(100, Math.max(0, (seconds / 3600) * 100)),
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

  // Determine overall urgency level
  const overallUrgency = useMemo((): UrgencyLevel => {
    if (reopenInfo) return 'safe'; // Reopen is good news
    
    const urgencies: UrgencyLevel[] = [];
    if (countdown?.urgency) urgencies.push(countdown.urgency);
    if (openMicUrgency !== 'safe') urgencies.push(openMicUrgency);
    if (dedicheUrgency !== 'safe') urgencies.push(dedicheUrgency);

    if (urgencies.includes('critical')) return 'critical';
    if (urgencies.includes('urgent')) return 'urgent';
    if (urgencies.includes('warning')) return 'warning';
    return 'safe';
  }, [countdown, openMicUrgency, dedicheUrgency, reopenInfo]);

  const colors = getUrgencyColors(reopenInfo ? 'safe' : overallUrgency);

  // Don't show if closed
  if (countdown?.expired && !reopenInfo) {
    return (
      <div className={cn(
        "p-4 rounded-xl border-2 bg-destructive/5 border-destructive/30",
        className
      )}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-destructive/20">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <span className="text-base font-bold text-destructive">Prenotazioni chiuse</span>
            <p className="text-xs text-destructive/70">Grazie per aver partecipato!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border-2 transition-all duration-300",
      colors.bg,
      colors.border,
      overallUrgency === 'critical' && !reopenInfo && "animate-pulse",
      reopenInfo && "ring-2 ring-secondary/50 shadow-lg shadow-secondary/20",
      className
    )}>
      {/* Progress bar for countdown */}
      {countdown && !countdown.expired && countdown.percentage > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted/50">
          <div 
            className={cn(
              "h-full transition-all duration-1000",
              countdown.urgency === 'safe' && "bg-emerald-500",
              countdown.urgency === 'warning' && "bg-yellow-500",
              countdown.urgency === 'urgent' && "bg-orange-500",
              countdown.urgency === 'critical' && "bg-destructive"
            )}
            style={{ width: `${countdown.percentage}%` }}
          />
        </div>
      )}

      <div className="p-4">
        {/* Reopen banner */}
        {reopenInfo && (
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-secondary/30">
            <div className="p-2 rounded-full bg-secondary/20 animate-bounce">
              <RefreshCw className="w-5 h-5 text-secondary" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-bold text-secondary">{reopenInfo.message}</span>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-secondary/80">
                <Timer className="w-3 h-3" />
                <span>Tempo rimanente: {reopenInfo.timeLeft}</span>
              </div>
            </div>
            <div className="flex flex-col items-end text-xs text-secondary">
              {reopenInfo.extraSongs && (
                <span className="flex items-center gap-1">
                  <Music className="w-3 h-3" />
                  +{reopenInfo.extraSongs}
                </span>
              )}
              {reopenInfo.extraDediche && (
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  +{reopenInfo.extraDediche}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          {/* Countdown */}
          {countdown && !countdown.expired && (
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg",
              colors.badge
            )}>
              <Clock className="w-4 h-4" />
              <span className="font-bold text-sm tabular-nums">{countdown.text}</span>
              {countdown.urgency === 'critical' && (
                <Flame className="w-4 h-4 animate-pulse" />
              )}
            </div>
          )}

          {/* Open Mic remaining */}
          {(format === 'openmic' || format === 'both') && openMicRemaining !== null && (
            <SlotIndicator
              icon={<Music className="w-4 h-4" />}
              remaining={openMicRemaining}
              total={event.openmic_max_songs!}
              label={openMicRemaining === 1 ? 'canzone' : 'canzoni'}
              urgency={openMicUrgency}
            />
          )}

          {/* Dediche remaining */}
          {(format === 'dediche' || format === 'both') && dedicheRemaining !== null && (
            <SlotIndicator
              icon={<Heart className="w-4 h-4" />}
              remaining={dedicheRemaining}
              total={event.dediche_max_total!}
              label={dedicheRemaining === 1 ? 'dedica' : 'dediche'}
              urgency={dedicheUrgency}
            />
          )}
        </div>

        {/* Urgency message */}
        {overallUrgency === 'critical' && !reopenInfo && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-destructive/20">
            <Flame className="w-4 h-4 text-destructive animate-pulse" />
            <p className="text-sm font-medium text-destructive">
              Affrettati! Ultimi posti o tempo limitato
            </p>
          </div>
        )}

        {/* Safe mode message */}
        {overallUrgency === 'safe' && !reopenInfo && countdown && !countdown.expired && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-emerald-500/20">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <p className="text-xs text-emerald-500/80">
              C'è ancora tempo per prenotare
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Slot indicator component
interface SlotIndicatorProps {
  icon: React.ReactNode;
  remaining: number;
  total: number;
  label: string;
  urgency: UrgencyLevel;
}

const SlotIndicator: React.FC<SlotIndicatorProps> = ({ 
  icon, 
  remaining, 
  total, 
  label, 
  urgency 
}) => {
  const colors = getUrgencyColors(urgency);
  const percentage = (remaining / total) * 100;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg",
      colors.badge
    )}>
      {icon}
      <div className="flex items-center gap-1.5">
        {remaining === 0 ? (
          <span className="font-bold text-sm">Esaurite</span>
        ) : (
          <>
            <span className="font-bold text-sm tabular-nums">{remaining}</span>
            <span className="text-xs opacity-80">/{total}</span>
            <span className="text-xs">{label}</span>
          </>
        )}
      </div>
      {/* Mini progress bar */}
      <div className="w-12 h-1.5 rounded-full bg-black/20 overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all",
            urgency === 'safe' && "bg-emerald-400",
            urgency === 'warning' && "bg-yellow-400",
            urgency === 'urgent' && "bg-orange-400",
            urgency === 'critical' && "bg-red-400"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};