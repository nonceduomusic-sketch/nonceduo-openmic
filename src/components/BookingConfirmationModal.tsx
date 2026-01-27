import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Music, Loader2, FileText, Heart, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Song } from '@/data/songs';
import { useReservations } from '@/hooks/useReservations';
import { z } from 'zod';
import { toast } from 'sonner';
import { getLyricsSearchUrl } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';
import { fireCelebration, fireHearts } from '@/lib/confetti';
import { SuccessAnimation } from '@/components/effects/SuccessAnimation';
import { UserLimitWarningDialog } from '@/components/UserLimitWarningDialog';

const reservationSchema = z.object({
  customer_name: z.string().trim()
    .min(2, 'Nome troppo corto (minimo 2 caratteri)')
    .max(50, 'Nome troppo lungo (massimo 50 caratteri)')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Il nome può contenere solo lettere, spazi e apostrofi'),
});

interface BookingConfirmationModalProps {
  song: Song;
  onClose: () => void;
}

/**
 * BookingConfirmationModal - Modal per prenotare una canzone
 * 
 * NOTA: La protezione PIN avviene a livello di PAGINA (AppOpenMic/AppDediche).
 * Una volta che l'utente ha superato il gate PIN ed è entrato nella pagina,
 * può prenotare liberamente senza ulteriori vincoli.
 * 
 * DEDICHE: Se il format Dediche è attivo, mostra un'opzione per aggiungere
 * una dedica personalizzata alla prenotazione.
 */
export const BookingConfirmationModal: React.FC<BookingConfirmationModalProps> = ({ 
  song, 
  onClose
}) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  
  // Dedication state
  const [wantsDedication, setWantsDedication] = useState(false);
  const [dedicationMessage, setDedicationMessage] = useState('');
  
  // User limit warning state
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [limitWarningData, setLimitWarningData] = useState<{
    message: string;
    limitType?: string;
    cooldownMinutes?: number;
    cooldownEndsAt?: string;
  } | null>(null);
  
  const { createReservation } = useReservations();
  const handleSearchLyrics = () => {
    window.open(getLyricsSearchUrl(song.title, song.artist), '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const validation = reservationSchema.safeParse({ customer_name: name });
    if (!validation.success) {
      const errorMessage = validation.error.errors[0]?.message || 'Dati non validi';
      toast.error(errorMessage);
      return;
    }
    
    // Validate dedication length if provided
    if (wantsDedication && dedicationMessage.length > 300) {
      toast.error('Dedica troppo lunga (massimo 300 caratteri)');
      return;
    }

    setIsSubmitting(true);
    
    const result = await createReservation(
      validation.data.customer_name, 
      song.title, 
      song.artist,
      wantsDedication && dedicationMessage.trim() ? dedicationMessage.trim() : undefined
    );
    
    // Handle user limit warning (pre-booking block)
    if (typeof result === 'object' && result.errorType === 'user_limit') {
      setLimitWarningData({
        message: result.error,
        limitType: result.limitType,
        cooldownMinutes: result.cooldownMinutes,
        cooldownEndsAt: result.cooldownEndsAt,
      });
      setShowLimitWarning(true);
      setIsSubmitting(false);
      return;
    }
    
    // Handle success
    if (result === true || (typeof result === 'object' && result.success)) {
      setIsConfirmed(true);
      
      // Fire celebration effects
      if (wantsDedication && dedicationMessage.trim()) {
        fireHearts();
      } else {
        fireCelebration();
      }
      
      // Check if user has NOW reached their limit after this booking
      // Show a friendly message after the success animation
      if (typeof result === 'object' && result.limitReached) {
        // Delay showing the limit reached dialog until after the success is shown
        setTimeout(() => {
          setLimitWarningData({
            message: result.limitReached.message,
            limitType: result.limitReached.type,
            cooldownMinutes: undefined,
          });
          setShowLimitWarning(true);
        }, 2000); // Show after 2 seconds so user sees success first
      }
    }
    
    setIsSubmitting(false);
  };

  // Always show dedication option - it's a booking feature, not tied to dediche format
  const showDedicationOption = true;

  if (isConfirmed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-md glass-card p-8 neon-border-cyan border-2 animate-slide-in text-center relative overflow-hidden">
          {/* Success Animation */}
          <SuccessAnimation
            variant={wantsDedication && dedicationMessage.trim() ? 'dedication' : 'booking'}
            title={`${name}, sei in lista! 🎤`}
            subtitle={`La tua prenotazione per "${song.title}" è stata confermata.`}
          />
          
          {wantsDedication && dedicationMessage.trim() && (
            <p className="text-sm text-primary mt-4 flex items-center justify-center gap-1.5">
              <Heart className="w-4 h-4" />
              Dedica inclusa
            </p>
          )}
          
          <p className="text-sm text-muted-foreground mt-4 mb-6">
            Ti chiameremo quando sarà il tuo turno!
          </p>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleSearchLyrics}
              variant="outline"
              className="w-full h-11 gap-2 border-secondary/50 hover:border-secondary hover:bg-secondary/10"
            >
              <FileText className="w-4 h-4" />
              Testo
            </Button>
            
            <Button
              onClick={onClose}
              className="w-full neon-button-cyan h-12 font-display font-semibold"
            >
              Chiudi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md glass-card p-6 neon-border-pink border-2 animate-slide-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold neon-text-pink">
            Prenota Canzone
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-4 rounded-lg bg-muted/50 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
            <Music className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-display font-semibold text-foreground">
              {song.title}
            </p>
            <p className="text-sm text-secondary">{song.artist}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Il tuo nome
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Inserisci il tuo nome..."
              className="bg-muted border-border focus:border-primary focus:ring-primary"
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          {/* Dedication option - only shown if dediche format is active */}
          {showDedicationOption && (
            <div className="space-y-3">
              <div 
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  wantsDedication 
                    ? "border-primary/50 bg-primary/5" 
                    : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                )}
                onClick={() => setWantsDedication(!wantsDedication)}
              >
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    id="dedication"
                    checked={wantsDedication}
                    onCheckedChange={(checked) => setWantsDedication(checked === true)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="dedication" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                    <Heart className="w-4 h-4 text-primary" />
                    Vuoi aggiungere una dedica?
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Scrivi un messaggio speciale da leggere durante la serata
                  </p>
                </div>
                {wantsDedication ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              {/* Dedication textarea - animated appearance */}
              <div className={cn(
                "overflow-hidden transition-all duration-300",
                wantsDedication ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
              )}>
                <Textarea
                  value={dedicationMessage}
                  onChange={(e) => setDedicationMessage(e.target.value)}
                  placeholder="Scrivi la tua dedica... (es: Per Maria, con tutto il mio amore ❤️)"
                  className="bg-muted border-border focus:border-primary focus:ring-primary resize-none"
                  rows={3}
                  maxLength={300}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground text-right mt-1">
                  {dedicationMessage.length}/300
                </p>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="w-full neon-button-pink h-12 font-display font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Prenotazione...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Conferma Prenotazione
              </>
            )}
          </Button>
        </form>
      </div>
      
      {/* User Limit Warning Dialog */}
      <UserLimitWarningDialog
        isOpen={showLimitWarning}
        onClose={() => {
          setShowLimitWarning(false);
          setLimitWarningData(null);
          onClose();
        }}
        message={limitWarningData?.message || ''}
        limitType={limitWarningData?.limitType as any}
        cooldownMinutes={limitWarningData?.cooldownMinutes}
        cooldownEndsAt={limitWarningData?.cooldownEndsAt}
      />
    </div>
  );
};
