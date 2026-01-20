import React, { useState } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Song } from '@/data/songs';
import { openWhatsApp, formatWhatsAppMessage } from '@/lib/whatsapp';
import { useReservations } from '@/hooks/useReservations';
import { z } from 'zod';
import { toast } from 'sonner';

const reservationSchema = z.object({
  customer_name: z.string().trim()
    .min(2, 'Nome troppo corto (minimo 2 caratteri)')
    .max(50, 'Nome troppo lungo (massimo 50 caratteri)')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Il nome può contenere solo lettere, spazi e apostrofi'),
});

interface BookingModalProps {
  song: Song;
  onClose: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ song, onClose }) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createReservation } = useReservations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Validate input
    const validation = reservationSchema.safeParse({ customer_name: name });
    if (!validation.success) {
      const errorMessage = validation.error.errors[0]?.message || 'Dati non validi';
      toast.error(errorMessage);
      return;
    }

    setIsSubmitting(true);
    
    // Save to database
    const success = await createReservation(validation.data.customer_name, song.title, song.artist);
    
    if (success) {
      // Open WhatsApp with iOS-compatible function
      openWhatsApp(validation.data.customer_name, song.title, song.artist);
      onClose();
    }
    
    setIsSubmitting(false);
  };

  const previewMessage = name.trim() 
    ? formatWhatsAppMessage(name.trim(), song.title, song.artist)
    : 'Inserisci il tuo nome per vedere l\'anteprima...';

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

        <div className="mb-4 p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Canzone selezionata:</p>
          <p className="font-display font-semibold text-foreground">
            {song.title}
          </p>
          <p className="text-sm text-secondary">{song.artist}</p>
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
            />
          </div>

          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              Anteprima messaggio WhatsApp:
            </p>
            <p className="text-sm text-foreground italic">
              "{previewMessage}"
            </p>
          </div>

          <Button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="w-full neon-button-pink h-12 font-display font-semibold"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Invio...' : 'Invia Prenotazione'}
          </Button>
        </form>
      </div>
    </div>
  );
};
