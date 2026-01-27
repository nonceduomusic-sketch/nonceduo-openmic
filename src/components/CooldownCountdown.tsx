import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CooldownCountdownProps {
  cooldownEndsAt: string;
  onExpire?: () => void;
  className?: string;
}

/**
 * CooldownCountdown - Mostra un countdown live fino allo sblocco del limite temporale.
 * Aggiorna ogni secondo e chiama onExpire quando scade.
 */
export const CooldownCountdown: React.FC<CooldownCountdownProps> = ({
  cooldownEndsAt,
  onExpire,
  className,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<{
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({ minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const endTime = new Date(cooldownEndsAt).getTime();
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        setTimeRemaining({ minutes: 0, seconds: 0, expired: true });
        onExpire?.();
        return true; // expired
      }

      const totalSeconds = Math.ceil(diff / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      setTimeRemaining({ minutes, seconds, expired: false });
      return false;
    };

    // Initial calculation
    const expired = calculateTimeRemaining();
    if (expired) return;

    // Update every second
    const interval = setInterval(() => {
      const expired = calculateTimeRemaining();
      if (expired) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownEndsAt, onExpire]);

  if (timeRemaining.expired) {
    return (
      <div className={cn(
        "flex items-center justify-center gap-2 p-3 rounded-lg bg-green-500/20 border border-green-500/50",
        className
      )}>
        <span className="text-sm font-medium text-green-400">
          ✨ Puoi prenotare di nuovo!
        </span>
      </div>
    );
  }

  const formatTime = (minutes: number, seconds: number) => {
    const m = minutes.toString().padStart(2, '0');
    const s = seconds.toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className={cn(
      "flex items-center justify-center gap-2 p-4 rounded-lg bg-green-500/10 border border-green-500/30",
      className
    )}>
      <Timer className="w-5 h-5 text-green-500 animate-pulse" />
      <div className="flex flex-col items-center">
        <span className="text-xs text-muted-foreground mb-1">
          Potrai prenotare tra
        </span>
        <span className="text-2xl font-mono font-bold text-green-500 tabular-nums">
          {formatTime(timeRemaining.minutes, timeRemaining.seconds)}
        </span>
      </div>
    </div>
  );
};
