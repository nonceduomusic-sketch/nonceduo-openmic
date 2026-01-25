import React from 'react';
 import { Clock, Music2, Instagram, Heart, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FreeModeClosureOverlayProps {
  closureTitle?: string;
  closureMessage?: string;
  className?: string;
}

/**
 * FreeModeClosureOverlay - Displays friendly closure message when bookings are closed
 * Shows overlay when Free Mode bookings are closed (expired or limit reached)
 * NOT an error - just a friendly notification that booking time has ended
 */
export const FreeModeClosureOverlay: React.FC<FreeModeClosureOverlayProps> = ({
  closureTitle = 'Prenotazioni chiuse',
  closureMessage = 'Grazie per aver partecipato! Ci vediamo alla prossima serata.',
  className,
}) => {
  return (
    <div className={cn(
      "p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 border-2 border-primary/20 text-center",
      "animate-in fade-in-0 slide-in-from-bottom-4 duration-500",
      className
    )}>
      {/* Friendly icon - not warning/error */}
      <div className="relative mx-auto w-20 h-20 mb-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-full animate-pulse" />
        <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full">
          <PartyPopper className="w-10 h-10 text-primary" />
        </div>
      </div>
      
      {/* Title - friendly, not alarming */}
      <h3 className="text-xl font-display font-bold text-foreground mb-3">
        {closureTitle}
      </h3>
      
      {/* Message */}
      <p className="text-base text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
        {closureMessage}
      </p>
      
      {/* Reassuring note */}
      <div className="flex items-center justify-center gap-2 text-sm text-primary/80 mb-6">
        <Heart className="w-4 h-4" />
        <span>Grazie per essere stati con noi!</span>
      </div>
      
      {/* Social links */}
      <p className="text-xs text-muted-foreground mb-3">
        Seguici per i prossimi eventi:
      </p>
       <div className="flex justify-center">
         <Button variant="outline" size="sm" className="gap-2" asChild>
           <a
             href="https://www.instagram.com/nonceduo.music/"
             target="_blank"
             rel="noopener noreferrer"
           >
             <Instagram className="w-4 h-4" />
             Instagram
           </a>
         </Button>
       </div>
    </div>
  );
};

/**
 * FreeModeClosureBanner - Compact banner version for list headers
 * Friendly design, not alarming
 */
export const FreeModeClosureBanner: React.FC<FreeModeClosureOverlayProps> = ({
  closureTitle = 'Prenotazioni chiuse',
  closureMessage = 'Grazie per aver partecipato!',
  className,
}) => {
  return (
    <div className={cn(
      "p-4 rounded-xl border-2 bg-primary/5 border-primary/30",
      "animate-in fade-in-0 duration-300",
      className
    )}>
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-full bg-primary/20">
          <Clock className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <span className="text-base font-bold text-foreground">
            {closureTitle}
          </span>
          <p className="text-sm text-muted-foreground">
            {closureMessage}
          </p>
        </div>
        <Music2 className="w-6 h-6 text-primary/50" />
      </div>
    </div>
  );
};

export default FreeModeClosureOverlay;
