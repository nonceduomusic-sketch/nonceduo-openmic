import React from 'react';
import { AlertTriangle, Clock, Music2, Repeat, Hash, X, Sparkles, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UserLimitWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  limitType?: 'total_songs' | 'total_dediche' | 'consecutive' | 'interval';
  cooldownMinutes?: number;
}

/**
 * UserLimitWarningDialog - Mostra un messaggio elegante quando l'utente
 * raggiunge un limite di prenotazioni. Design coerente con il tema dell'app.
 * 
 * Può essere usato in due contesti:
 * 1. PRE-BOOKING BLOCK: quando l'utente non può prenotare (cooldownMinutes presente)
 * 2. POST-BOOKING INFO: quando l'utente ha appena raggiunto il limite (messaggio positivo)
 */
export const UserLimitWarningDialog: React.FC<UserLimitWarningDialogProps> = ({
  isOpen,
  onClose,
  message,
  limitType,
  cooldownMinutes,
}) => {
  if (!isOpen) return null;

  // Determine if this is a blocking message or a success notification
  const isBlockingLimit = cooldownMinutes !== undefined && cooldownMinutes > 0;
  const isSuccessNotification = !isBlockingLimit && message.includes('Ottimo') || message.includes('Grazie') || message.includes('in forma');

  const getIcon = () => {
    if (isSuccessNotification) {
      return <PartyPopper className="w-8 h-8" />;
    }
    switch (limitType) {
      case 'total_songs':
      case 'total_dediche':
        return <Hash className="w-8 h-8" />;
      case 'consecutive':
        return <Repeat className="w-8 h-8" />;
      case 'interval':
        return <Clock className="w-8 h-8" />;
      default:
        return <AlertTriangle className="w-8 h-8" />;
    }
  };

  const getTitle = () => {
    if (isSuccessNotification) {
      switch (limitType) {
        case 'total_songs':
          return '🎉 Tutte le tue canzoni!';
        case 'total_dediche':
          return '❤️ Dediche completate!';
        case 'consecutive':
          return '🌟 Che energia!';
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
        return 'Troppe prenotazioni consecutive';
      case 'interval':
        return 'Attendi un momento';
      default:
        return 'Limite raggiunto';
    }
  };

  const getAccentColor = () => {
    if (isSuccessNotification) {
      return 'from-primary/30 to-secondary/20 border-primary/50';
    }
    switch (limitType) {
      case 'total_songs':
      case 'total_dediche':
        return 'from-primary/20 to-primary/5 border-primary/30';
      case 'consecutive':
        return 'from-secondary/20 to-secondary/5 border-secondary/30';
      case 'interval':
        return 'from-accent/20 to-accent/5 border-accent/30';
      default:
        return 'from-destructive/20 to-destructive/5 border-destructive/30';
    }
  };

  const getIconColor = () => {
    if (isSuccessNotification) {
      return 'text-primary';
    }
    switch (limitType) {
      case 'total_songs':
      case 'total_dediche':
        return 'text-primary';
      case 'consecutive':
        return 'text-secondary';
      case 'interval':
        return 'text-accent';
      default:
        return 'text-destructive';
    }
  };

  const getEncouragementMessage = () => {
    if (isSuccessNotification) {
      switch (limitType) {
        case 'total_songs':
          return '🎶 Ora siediti, rilassati e goditi le esibizioni degli altri artisti!';
        case 'total_dediche':
          return '💌 I tuoi messaggi speciali saranno letti durante la serata!';
        case 'consecutive':
        return '🎤 Fai un po\' di tifo per gli altri e poi tornerai a cantare!';
      default:
        return '🌟 Grazie per la tua partecipazione questa sera!';
    }
  }
    switch (limitType) {
      case 'consecutive':
        return '🎵 Lascia spazio agli altri partecipanti, tornerai presto a cantare!';
      case 'interval':
        return '🎤 Nel frattempo, goditi le esibizioni degli altri!';
      default:
        return '🌟 Grazie per la tua partecipazione questa sera!';
    }
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
          isSuccessNotification && "animate-bounce"
        )}>
          {getIcon()}
        </div>

        {/* Sparkles for success */}
        {isSuccessNotification && (
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
          {message}
        </p>

        {/* Cooldown Timer (if applicable - blocking mode only) */}
        {isBlockingLimit && (
          <div className="flex items-center justify-center gap-2 mb-6 p-3 rounded-lg bg-muted/50">
            <Clock className="w-5 h-5 text-accent animate-pulse" />
            <span className="text-sm font-medium">
              Potrai riprendere tra <span className="text-accent font-bold">{cooldownMinutes}</span> minuti
            </span>
          </div>
        )}

        {/* Encouragement Message */}
        <div className={cn(
          "text-center text-sm mb-6 p-3 rounded-lg",
          isSuccessNotification ? "bg-primary/10 text-foreground" : "text-muted-foreground"
        )}>
          <p>{getEncouragementMessage()}</p>
        </div>

        {/* Close Button */}
        <Button
          onClick={onClose}
          className={cn(
            "w-full h-12 font-display font-semibold",
            isSuccessNotification && "neon-button-cyan"
          )}
          variant={isSuccessNotification ? "default" : "outline"}
        >
          <Music2 className="w-4 h-4 mr-2" />
          {isSuccessNotification ? 'Fantastico!' : 'Ho capito'}
        </Button>
      </div>
    </div>
  );
};
