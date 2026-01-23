import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, Music, Loader2, FileText, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Song } from '@/data/songs';
import { useReservations } from '@/hooks/useReservations';
import { usePinValidation } from '@/hooks/useLiveSession';
import { PinInputField } from '@/components/PinInputField';
import { z } from 'zod';
import { toast } from 'sonner';
import { getLyricsSearchUrl } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

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

export const BookingConfirmationModal: React.FC<BookingConfirmationModalProps> = ({ 
  song, 
  onClose
}) => {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | undefined>();
  const [pinValid, setPinValid] = useState(false);
  const [isValidatingPin, setIsValidatingPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  
  const { createReservation } = useReservations();
  const { isLiveMode, loading: liveLoading, validatePin } = usePinValidation('openmic');

  // Validate PIN when it changes (debounced)
  const debouncedValidatePin = useCallback(async (pinValue: string) => {
    if (!isLiveMode || pinValue.length < 6) {
      setPinError(undefined);
      setPinValid(false);
      return;
    }

    setIsValidatingPin(true);
    setPinError(undefined);
    
    const isValid = await validatePin(pinValue);
    
    setIsValidatingPin(false);
    setPinValid(isValid);
    
    if (!isValid) {
      setPinError('Codice non valido – chiedi al performer o al locale');
    }
  }, [isLiveMode, validatePin]);

  useEffect(() => {
    if (pin.length === 6) {
      const timeout = setTimeout(() => {
        debouncedValidatePin(pin);
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      setPinError(undefined);
      setPinValid(false);
    }
  }, [pin, debouncedValidatePin]);

  const handleSearchLyrics = () => {
    window.open(getLyricsSearchUrl(song.title, song.artist), '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Validate PIN if in live mode
    if (isLiveMode) {
      if (!pin.trim()) {
        setPinError('Inserisci il codice della serata');
        return;
      }
      
      setIsValidatingPin(true);
      const isValid = await validatePin(pin);
      setIsValidatingPin(false);
      
      if (!isValid) {
        setPinError('Codice non valido – chiedi al performer o al locale');
        return;
      }
    }

    const validation = reservationSchema.safeParse({ customer_name: name });
    if (!validation.success) {
      const errorMessage = validation.error.errors[0]?.message || 'Dati non validi';
      toast.error(errorMessage);
      return;
    }

    setIsSubmitting(true);
    
    const success = await createReservation(validation.data.customer_name, song.title, song.artist);
    
    if (success) {
      setIsConfirmed(true);
    }
    
    setIsSubmitting(false);
  };

  if (isConfirmed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-md glass-card p-6 neon-border-cyan border-2 animate-slide-in text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center animate-bounce">
            <CheckCircle className="w-10 h-10 text-secondary-foreground" />
          </div>
          
          <h2 className="font-display text-2xl font-bold neon-text-cyan mb-2">
            {name}, sei in lista! 🎤
          </h2>
          
          <p className="text-muted-foreground mb-4">
            Preparati a salire sul palco!
          </p>
          
          <div className="mb-6 p-4 rounded-lg bg-muted/50">
            <p className="text-foreground font-semibold text-lg">
              {song.title}
            </p>
            <p className="text-secondary">{song.artist}</p>
          </div>
          
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleSearchLyrics}
              className="neon-button-pink h-11 font-display font-semibold"
            >
              <FileText className="w-4 h-4 mr-2" />
              Cerca Testo
            </Button>
            
            <Button
              onClick={onClose}
              variant="outline"
              className="h-11 font-display font-semibold border-muted-foreground"
            >
              Torna alle Canzoni
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

        {/* Live Mode Indicator */}
        {!liveLoading && isLiveMode && (
          <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center gap-2 animate-in fade-in-0 slide-in-from-top-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground">
              <strong>Serata Live</strong> – È richiesto il codice PIN per prenotare
            </span>
          </div>
        )}

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

          {/* PIN Input - Only shown in live mode */}
          {!liveLoading && isLiveMode && (
            <PinInputField
              value={pin}
              onChange={setPin}
              error={pinError}
              isValid={pinValid}
              isValidating={isValidatingPin}
              disabled={isSubmitting}
            />
          )}

          <Button
            type="submit"
            disabled={!name.trim() || isSubmitting || (isLiveMode && !pinValid)}
            className={cn(
              "w-full neon-button-pink h-12 font-display font-semibold",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
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
    </div>
  );
};
