import React, { useState, useEffect, useMemo } from 'react';
import { Timer, Rocket, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInSeconds, parseISO } from 'date-fns';

interface EventCountdownBannerProps {
  /**
   * Tipo di countdown: 'start' per partenza, 'end' per fine
   */
  type: 'start' | 'end';
  
  /**
   * Data/ora target in formato ISO (es: 2025-01-26T21:00:00)
   */
  targetTime: string | null;
  
  /**
   * Quanti minuti prima mostrare il countdown (null = sempre visibile)
   */
  showMinutesBefore?: number | null;
  
  /**
   * Label personalizzata (es: "Partenza evento", "Fine prenotazioni")
   */
  label?: string;
  
  /**
   * Callback quando il countdown raggiunge 0
   */
  onComplete?: () => void;
  
  /**
   * Stile compatto per UI ridotta
   */
  compact?: boolean;
  
  /**
   * Mostra animazioni pulse per urgenza
   */
  animated?: boolean;
  
  /**
   * Classe CSS aggiuntiva
   */
  className?: string;
}

/**
 * Banner countdown animato per eventi programmati.
 * 
 * Features:
 * - Countdown in tempo reale (aggiornato ogni secondo)
 * - Visibilità configurabile (X minuti prima o sempre)
 * - Colori urgenza (verde → giallo → rosso)
 * - Animazioni per attenzione
 */
export const EventCountdownBanner: React.FC<EventCountdownBannerProps> = ({
  type,
  targetTime,
  showMinutesBefore = null,
  label,
  onComplete,
  compact = false,
  animated = true,
  className,
}) => {
  const [now, setNow] = useState(new Date());
  const [hasCompleted, setHasCompleted] = useState(false);

  // Update every second
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Parse target time
  const targetDate = useMemo(() => {
    if (!targetTime) return null;
    try {
      const parsed = parseISO(targetTime);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  }, [targetTime]);

  // Calculate remaining time
  const remaining = useMemo(() => {
    if (!targetDate) return null;
    const seconds = differenceInSeconds(targetDate, now);
    return Math.max(0, seconds);
  }, [targetDate, now]);

  // Urgency level for styling - MUST BE BEFORE ANY RETURNS
  const urgencyLevel = useMemo(() => {
    if (remaining === null) return 'low';
    if (remaining <= 60) return 'critical'; // Last minute
    if (remaining <= 300) return 'high'; // Last 5 minutes
    if (remaining <= 600) return 'medium'; // Last 10 minutes
    return 'low';
  }, [remaining]);

  // Style based on urgency - MUST BE BEFORE ANY RETURNS
  const styleConfig = useMemo(() => {
    switch (urgencyLevel) {
      case 'critical':
        return {
          bg: 'bg-destructive/20',
          border: 'border-destructive/50',
          text: 'text-destructive',
          icon: AlertTriangle,
        };
      case 'high':
        return {
          bg: 'bg-orange-500/20 dark:bg-orange-500/10',
          border: 'border-orange-500/50',
          text: 'text-orange-600 dark:text-orange-400',
          icon: Timer,
        };
      case 'medium':
        return {
          bg: 'bg-amber-500/20 dark:bg-amber-500/10',
          border: 'border-amber-500/50',
          text: 'text-amber-600 dark:text-amber-400',
          icon: Clock,
        };
      default:
        return {
          bg: type === 'start' 
            ? 'bg-primary/20' 
            : 'bg-secondary/20',
          border: type === 'start' 
            ? 'border-primary/50' 
            : 'border-secondary/50',
          text: type === 'start' 
            ? 'text-primary' 
            : 'text-secondary',
          icon: type === 'start' ? Rocket : Clock,
        };
    }
  }, [urgencyLevel, type]);

  // Check if countdown completed
  useEffect(() => {
    if (remaining === 0 && !hasCompleted) {
      setHasCompleted(true);
      onComplete?.();
    }
  }, [remaining, hasCompleted, onComplete]);

  // Check visibility based on showMinutesBefore
  const isVisible = useMemo(() => {
    if (!targetDate || remaining === null) return false;
    
    // If showMinutesBefore is null, always visible
    if (showMinutesBefore === null) return true;
    
    // Show only if within the threshold
    const thresholdSeconds = showMinutesBefore * 60;
    return remaining <= thresholdSeconds && remaining > 0;
  }, [remaining, showMinutesBefore, targetDate]);

  const Icon = styleConfig.icon;
  const defaultLabel = type === 'start' ? 'Partenza tra' : 'Chiusura tra';

  // Don't render if not visible
  if (!isVisible || remaining === null || remaining === 0) {
    return null;
  }

  // Format time
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  if (compact) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
        styleConfig.bg,
        styleConfig.text,
        animated && urgencyLevel === 'critical' && "animate-pulse",
        className
      )}>
        <Icon className="w-3 h-3" />
        <span>
          {hours > 0 ? `${hours}h ` : ''}{minutes}m {seconds}s
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-xl border transition-all duration-300",
      styleConfig.bg,
      styleConfig.border,
      animated && urgencyLevel === 'critical' && "animate-pulse",
      animated && urgencyLevel === 'high' && "animate-[pulse_2s_ease-in-out_infinite]",
      className
    )}>
      <div className={cn(
        "flex items-center justify-center w-10 h-10 rounded-full",
        type === 'start' ? 'bg-primary/20' : 'bg-secondary/20'
      )}>
        <Icon className={cn("w-5 h-5", styleConfig.text)} />
      </div>
      
      <div className="flex-1">
        <div className={cn("text-sm font-medium", styleConfig.text)}>
          {label || defaultLabel}
        </div>
        <div className={cn("text-2xl font-bold tabular-nums", styleConfig.text)}>
          {hours > 0 && (
            <>
              <span>{String(hours).padStart(2, '0')}</span>
              <span className="text-lg opacity-70 mx-0.5">:</span>
            </>
          )}
          <span>{String(minutes).padStart(2, '0')}</span>
          <span className="text-lg opacity-70 mx-0.5">:</span>
          <span>{String(seconds).padStart(2, '0')}</span>
        </div>
      </div>

      {/* Urgency indicator */}
      {urgencyLevel === 'critical' && (
        <div className="flex flex-col items-center">
          <span className="text-xs text-destructive font-bold uppercase">URGENTE</span>
        </div>
      )}
    </div>
  );
};

export default EventCountdownBanner;
