import React from 'react';
import { AlertTriangle, Clock, Music2, Repeat, Hash, X } from 'lucide-react';
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
 * UserLimitWarningDialog - Mostra un messaggio professionale quando l'utente
 * raggiunge un limite di prenotazioni. Design coerente con il tema dell'app.
 */
export const UserLimitWarningDialog: React.FC<UserLimitWarningDialogProps> = ({
  isOpen,
  onClose,
  message,
  limitType,
  cooldownMinutes,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className={cn(
        "w-full max-w-md rounded-2xl p-6 shadow-2xl animate-slide-in",
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

        {/* Icon */}
        <div className={cn(
          "mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4",
          "bg-background/50 backdrop-blur-sm shadow-inner",
          getIconColor()
        )}>
          {getIcon()}
        </div>

        {/* Title */}
        <h2 className="text-xl font-display font-bold text-center text-foreground mb-3">
          {getTitle()}
        </h2>

        {/* Message */}
        <p className="text-center text-muted-foreground mb-6 leading-relaxed">
          {message}
        </p>

        {/* Cooldown Timer (if applicable) */}
        {limitType === 'interval' && cooldownMinutes && cooldownMinutes > 0 && (
          <div className="flex items-center justify-center gap-2 mb-6 p-3 rounded-lg bg-muted/50">
            <Clock className="w-5 h-5 text-accent animate-pulse" />
            <span className="text-sm font-medium">
              Potrai riprendere tra <span className="text-accent font-bold">{cooldownMinutes}</span> minuti
            </span>
          </div>
        )}

        {/* Encouragement Message */}
        <div className="text-center text-sm text-muted-foreground mb-6">
          {limitType === 'consecutive' ? (
            <p>🎵 Lascia spazio agli altri partecipanti, tornerai presto a cantare!</p>
          ) : limitType === 'interval' ? (
            <p>🎤 Nel frattempo, goditi le esibizioni degli altri!</p>
          ) : (
            <p>🌟 Grazie per la tua partecipazione questa sera!</p>
          )}
        </div>

        {/* Close Button */}
        <Button
          onClick={onClose}
          className="w-full h-12 font-display font-semibold"
          variant="outline"
        >
          <Music2 className="w-4 h-4 mr-2" />
          Ho capito
        </Button>
      </div>
    </div>
  );
};
