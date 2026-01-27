import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Music2, Hash, X, Sparkles, PartyPopper, Timer, Users, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UserLimitWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  limitType?: 'total_songs' | 'total_dediche' | 'consecutive' | 'interval';
  cooldownMinutes?: number;
  cooldownEndsAt?: string;
}

/**
 * UserLimitWarningDialog - Mostra un messaggio elegante quando l'utente
 * raggiunge un limite di prenotazioni. Design coerente con il tema dell'app.
 * 
 * Può essere usato in due contesti:
 * 1. PRE-BOOKING BLOCK: quando l'utente non può prenotare (cooldownEndsAt presente per interval)
 * 2. POST-BOOKING INFO: quando l'utente ha appena raggiunto il limite (messaggio positivo)
 */
export const UserLimitWarningDialog: React.FC<UserLimitWarningDialogProps> = ({
  isOpen,
  onClose,
  message,
  limitType,
  cooldownMinutes,
  cooldownEndsAt,
}) => {
  const [countdown, setCountdown] = useState<{ minutes: number; seconds: number; expired: boolean }>({
    minutes: 0,
    seconds: 0,
    expired: false,
  });

  // Calculate countdown when cooldownEndsAt is provided
  const calculateCountdown = useCallback(() => {
    if (!cooldownEndsAt) return { minutes: 0, seconds: 0, expired: true };
    
    const endTime = new Date(cooldownEndsAt).getTime();
    const now = Date.now();
    const diff = endTime - now;

    if (diff <= 0) {
      return { minutes: 0, seconds: 0, expired: true };
    }

    const totalSeconds = Math.ceil(diff / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return { minutes, seconds, expired: false };
  }, [cooldownEndsAt]);

  useEffect(() => {
    if (!isOpen || !cooldownEndsAt) return;

    // Initial calculation
    setCountdown(calculateCountdown());

    // Update every second
    const interval = setInterval(() => {
      const result = calculateCountdown();
      setCountdown(result);
      
      if (result.expired) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, cooldownEndsAt, calculateCountdown]);

  if (!isOpen) return null;

  // Determine if this is a blocking message or a success notification
  const isIntervalBlock = limitType === 'interval' && cooldownEndsAt && !countdown.expired;
  const isConsecutiveBlock = limitType === 'consecutive' && cooldownMinutes !== undefined;
  const isBlockingLimit = isIntervalBlock || isConsecutiveBlock;
  const isSuccessNotification = !isBlockingLimit && (message.includes('Ottimo') || message.includes('Grazie') || message.includes('in forma') || message.includes('ritmo'));

  const getIcon = () => {
    if (countdown.expired && limitType === 'interval') {
      return <CheckCircle className="w-8 h-8" />;
    }
    if (isSuccessNotification) {
      return <PartyPopper className="w-8 h-8" />;
    }
    switch (limitType) {
      case 'total_songs':
      case 'total_dediche':
        return <Hash className="w-8 h-8" />;
      case 'consecutive':
        return <Users className="w-8 h-8" />;
      case 'interval':
        return <Timer className="w-8 h-8" />;
      default:
        return <AlertTriangle className="w-8 h-8" />;
    }
  };

  const getTitle = () => {
    if (countdown.expired && limitType === 'interval') {
      return '✨ Sei di nuovo libero!';
    }
    if (isSuccessNotification) {
      switch (limitType) {
        case 'total_songs':
          return '🎉 Tutte le tue canzoni!';
        case 'total_dediche':
          return '❤️ Dediche completate!';
        case 'consecutive':
          return '🌟 Che energia!';
        case 'interval':
          return '⏱️ Gran ritmo!';
        default:
          return '✨ Fantastico!';
      }
    }
    switch (limitType) {
      case 'total_songs':
        return 'Limite canzoni raggiunto';
      case 'total_dediche':
        return 'Limite dediche raggiunto';
      case 'consecutive':
        return 'Tocca agli altri!';
      case 'interval':
        return 'Pausa in corso';
      default:
        return 'Limite raggiunto';
    }
  };

  const getAccentColor = () => {
    if (countdown.expired && limitType === 'interval') {
      return 'from-primary/30 to-secondary/20 border-primary/50';
    }
    if (isSuccessNotification) {
      return 'from-primary/30 to-secondary/20 border-primary/50';
    }
    switch (limitType) {
      case 'total_songs':
      case 'total_dediche':
        return 'from-primary/20 to-primary/5 border-primary/30';
      case 'consecutive':
        return 'from-orange-500/20 to-orange-500/5 border-orange-500/30';
      case 'interval':
        return 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30';
      default:
        return 'from-destructive/20 to-destructive/5 border-destructive/30';
    }
  };

  const getIconColor = () => {
    if (countdown.expired && limitType === 'interval') {
      return 'text-primary';
    }
    if (isSuccessNotification) {
      return 'text-primary';
    }
    switch (limitType) {
      case 'total_songs':
      case 'total_dediche':
        return 'text-primary';
      case 'consecutive':
        return 'text-orange-500';
      case 'interval':
        return 'text-emerald-500';
      default:
        return 'text-destructive';
    }
  };

  const getEncouragementMessage = () => {
    if (countdown.expired && limitType === 'interval') {
      return '🎤 Il tempo di attesa è terminato. Prenota subito la tua prossima canzone!';
    }
    if (isSuccessNotification) {
      switch (limitType) {
        case 'total_songs':
          return '🎶 Ora siediti, rilassati e goditi le esibizioni degli altri artisti!';
        case 'total_dediche':
          return '💌 I tuoi messaggi speciali saranno letti durante la serata!';
        case 'consecutive':
          return '🎤 Non appena qualcun altro prenota, tornerai a cantare!';
        case 'interval':
          return '⏰ Tra poco potrai prenotare di nuovo. Intanto goditi lo show!';
        default:
          return '🌟 Grazie per la tua partecipazione questa sera!';
      }
    }
    switch (limitType) {
      case 'consecutive':
        return '🎵 Non appena un altro partecipante prenota, potrai tornare a cantare!';
      case 'interval':
        return '🎤 Goditi le esibizioni degli altri, tra poco tornerai sul palco!';
      default:
        return '🌟 Grazie per la tua partecipazione questa sera!';
    }
  };

  const formatTime = (minutes: number, seconds: number) => {
    if (minutes === 0 && seconds < 60) {
      // Show just seconds if less than a minute
      return `00:${seconds.toString().padStart(2, '0')}`;
    }
    const m = minutes.toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className={cn(
        "w-full max-w-md rounded-2xl p-6 shadow-2xl animate-slide-in relative",
        "bg-gradient-to-br border-2",
        "bg-card",
        getAccentColor()
      )}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Icon with animation */}
        <div className={cn(
          "mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4",
          "bg-background/50 backdrop-blur-sm shadow-inner",
          getIconColor(),
          (isSuccessNotification || countdown.expired) && "animate-bounce"
        )}>
          {getIcon()}
        </div>

        {/* Sparkles for success */}
        {(isSuccessNotification || countdown.expired) && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-4">
            <Sparkles className="w-4 h-4 text-warning animate-pulse" />
            <Sparkles className="w-4 h-4 text-primary animate-pulse delay-100" />
            <Sparkles className="w-4 h-4 text-secondary animate-pulse delay-200" />
          </div>
        )}

        {/* Title */}
        <h2 className="text-xl font-display font-bold text-center text-foreground mb-3">
          {getTitle()}
        </h2>

        {/* Message */}
        <p className="text-center text-muted-foreground mb-6 leading-relaxed">
          {countdown.expired && limitType === 'interval' 
            ? 'Il tempo di attesa è terminato!' 
            : message}
        </p>

        {/* Live Countdown Timer (for interval limit blocking) */}
        {isIntervalBlock && !countdown.expired && (
          <div className="flex flex-col items-center justify-center gap-2 mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <Timer className="w-6 h-6 text-emerald-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Potrai prenotare tra</span>
            <span className="text-3xl font-mono font-bold text-emerald-500 tabular-nums">
              {formatTime(countdown.minutes, countdown.seconds)}
            </span>
          </div>
        )}

        {/* Consecutive limit info (blocking) */}
        {isConsecutiveBlock && (
          <div className="flex items-center justify-center gap-2 mb-6 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <Users className="w-5 h-5 text-orange-500 animate-pulse" />
            <span className="text-sm font-medium text-center">
              Quando un altro partecipante prenota, potrai riprendere!
            </span>
          </div>
        )}

        {/* Encouragement Message */}
        <div className={cn(
          "text-center text-sm mb-6 p-3 rounded-lg",
          (isSuccessNotification || countdown.expired) ? "bg-primary/10 text-foreground" : "text-muted-foreground"
        )}>
          <p>{getEncouragementMessage()}</p>
        </div>

        {/* Close Button */}
        <Button
          onClick={onClose}
          className={cn(
            "w-full h-12 font-display font-semibold",
            (isSuccessNotification || countdown.expired) && "neon-button-cyan"
          )}
          variant={(isSuccessNotification || countdown.expired) ? "default" : "outline"}
        >
          <Music2 className="w-4 h-4 mr-2" />
          {countdown.expired && limitType === 'interval' 
            ? 'Prenota ora!' 
            : isSuccessNotification 
              ? 'Fantastico!' 
              : 'Ho capito'}
        </Button>
      </div>
    </div>
  );
};