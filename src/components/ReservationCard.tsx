import React, { useState } from 'react';
import { Check, RotateCcw, Music, Clock, MessageCircle, Trash2, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Reservation } from '@/hooks/useReservations';
import { formatWhatsAppMessage } from '@/lib/whatsapp';
import { LyricsDialog } from './LyricsDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ReservationCardProps {
  reservation: Reservation;
  onComplete?: (id: string) => void;
  onReactivate?: (id: string) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
}

export const ReservationCard: React.FC<ReservationCardProps> = ({
  reservation,
  onComplete,
  onReactivate,
  onDelete,
  showActions = true,
  selectionMode = false,
  isSelected = false,
  onSelect,
}) => {
  const [lyricsDialogOpen, setLyricsDialogOpen] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const message = formatWhatsAppMessage(
    reservation.customer_name,
    reservation.song_title,
    reservation.song_artist
  );

  const isCompleted = reservation.status === 'completed';

  return (
    <>
      <div
        className={`glass-card p-4 transition-all duration-300 ${
          isCompleted ? 'opacity-70' : 'hover:neon-glow-pink'
        } ${isSelected ? 'ring-2 ring-primary neon-glow-pink' : ''}`}
      >
        <div className="flex items-start gap-3">
          {selectionMode && (
            <div className="flex items-center pt-1">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelect?.(reservation.id, checked as boolean)}
                className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              />
            </div>
          )}
          
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isCompleted
                ? 'bg-muted'
                : 'bg-gradient-to-br from-primary/20 to-secondary/20'
            }`}
          >
            <Music
              className={`w-5 h-5 ${isCompleted ? 'text-muted-foreground' : 'text-primary'}`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-display font-semibold text-foreground">
                {reservation.customer_name}
              </span>
              {isCompleted && (
                <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full">
                  Completata
                </span>
              )}
            </div>

            <p className="font-medium text-sm text-foreground truncate">
              {reservation.song_title}
            </p>
            <p className="text-xs text-secondary truncate">
              {reservation.song_artist}
            </p>

            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatDate(reservation.created_at)}
            </div>
          </div>
        </div>

        <div className="mt-3 p-2 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <MessageCircle className="w-3 h-3" />
            Messaggio:
          </div>
          <p className="text-xs text-foreground italic">"{message}"</p>
        </div>

        {/* Lyrics/Chords button - always visible */}
        <div className="mt-3">
          <Button
            onClick={() => setLyricsDialogOpen(true)}
            variant="outline"
            size="sm"
            className="w-full border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
          >
            <FileText className="w-4 h-4 mr-2" />
            Testo / Accordi
          </Button>
        </div>

        {showActions && !selectionMode && (
          <div className="mt-3 flex gap-2">
            {isCompleted ? (
              <>
                <Button
                  onClick={() => onReactivate?.(reservation.id)}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Riattiva
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass-card border-destructive">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" />
                        Elimina Prenotazione
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Sei sicuro di voler eliminare la prenotazione di "{reservation.customer_name}" per "{reservation.song_title}"?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-border">Annulla</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete?.(reservation.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Elimina
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <>
                <Button
                  onClick={() => onComplete?.(reservation.id)}
                  size="sm"
                  className="flex-1 neon-button-cyan"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Completa
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass-card border-destructive">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" />
                        Elimina Prenotazione
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Sei sicuro di voler eliminare la prenotazione di "{reservation.customer_name}" per "{reservation.song_title}"?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-border">Annulla</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete?.(reservation.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Elimina
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        )}
      </div>

      <LyricsDialog
        open={lyricsDialogOpen}
        onOpenChange={setLyricsDialogOpen}
        songTitle={reservation.song_title}
        songArtist={reservation.song_artist}
      />
    </>
  );
};
