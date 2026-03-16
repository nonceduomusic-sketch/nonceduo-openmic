import React, { useState } from 'react';
import { Check, RotateCcw, Music, Clock, Heart, Trash2, FileText, AlertTriangle, Maximize2, Flame, ThumbsUp, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Reservation } from '@/hooks/useReservations';
import { LyricsDialog } from './LyricsDialog';
import { cn } from '@/lib/utils';
import { useAdminFontSize } from '@/hooks/useAdminFontSize';
import { DedicationExpandDialog } from '@/components/admin/DedicationExpandDialog';
import { useAllVoteCounts } from '@/hooks/useAllVoteCounts';
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
  onBroadcast?: (reservation: Reservation) => void;
  showActions?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
  /** Compact mobile-friendly layout */
  compact?: boolean;
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
  compact = false,
}) => {
  const [lyricsDialogOpen, setLyricsDialogOpen] = useState(false);
  const [dedicationDialogOpen, setDedicationDialogOpen] = useState(false);
  const { fontSizeClass } = useAdminFontSize();
  const { getVotesForReservation } = useAllVoteCounts();
  const votes = getVotesForReservation(reservation.id);

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

  const isCompleted = reservation.status === 'completed';
  const hasDedication = reservation.dedication_message && reservation.dedication_message.trim().length > 0;

  return (
    <>
      <div
        className={`glass-card ${compact ? 'p-3 md:p-4' : 'p-4'} transition-all duration-300 ${
          isCompleted ? 'opacity-70' : 'hover:neon-glow-pink'
        } ${isSelected ? 'ring-2 ring-primary neon-glow-pink' : ''}`}
      >
        <div className={compact ? 'flex items-start gap-2.5' : 'flex items-start gap-3'}>
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
            className={`${compact ? 'w-9 h-9 rounded-lg' : 'w-10 h-10 rounded-lg'} flex items-center justify-center flex-shrink-0 ${
              isCompleted
                ? 'bg-muted'
                : 'bg-gradient-to-br from-primary/20 to-secondary/20'
            }`}
          >
            <Music
              className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} ${isCompleted ? 'text-muted-foreground' : 'text-primary'}`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className={compact ? 'flex items-center gap-2 mb-0.5' : 'flex items-center gap-2 mb-1'}>
              <span className="font-display font-semibold text-foreground">
                {reservation.customer_name}
              </span>
              {isCompleted && (
                <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full">
                  Completata
                </span>
              )}
            </div>

            <p className={compact ? 'font-medium text-sm text-foreground truncate leading-snug' : 'font-medium text-sm text-foreground truncate'}>
              {reservation.song_title}
            </p>
            <p className="text-xs text-secondary truncate">
              {reservation.song_artist}
            </p>

            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(reservation.created_at)}
              </div>
              
              {/* Votes display */}
              {votes && votes.total_votes > 0 && (() => {
                const upVotes = votes.total_votes - votes.fire_votes - votes.heart_votes;
                return (
                  <div className="flex items-center gap-2 ml-auto">
                    {upVotes > 0 && (
                      <span className="flex items-center gap-0.5 text-secondary">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        {upVotes}
                      </span>
                    )}
                    {votes.fire_votes > 0 && (
                      <span className="flex items-center gap-0.5 text-orange-500">
                        <Flame className="w-3.5 h-3.5" />
                        {votes.fire_votes}
                      </span>
                    )}
                    {votes.heart_votes > 0 && (
                      <span className="flex items-center gap-0.5 text-pink-500">
                        <Heart className="w-3.5 h-3.5 fill-current" />
                        {votes.heart_votes}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Dedication section - clickable to expand */}
        {hasDedication && (
          <button
            onClick={() => setDedicationDialogOpen(true)}
            className={cn(
              "mt-3 w-full text-left relative overflow-hidden",
              "rounded-xl",
              "bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10",
              "border border-primary/20 hover:border-primary/40 transition-colors group"
            )}
          >
            {/* Header con icona cuore */}
            <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Heart className="w-3 h-3 text-primary-foreground fill-current" />
                </div>
                <span className="text-xs font-semibold text-primary">Dedica speciale</span>
              </div>
              <Maximize2 className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            
            {/* Messaggio della dedica */}
            <div className="px-3 pb-3">
              <p className={cn(
                "text-foreground leading-relaxed",
                "italic",
                compact ? "line-clamp-3" : "line-clamp-4",
                fontSizeClass
              )}>
                "{reservation.dedication_message}"
              </p>
            </div>
            
            {/* Decorazione sfumata in basso */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 via-secondary/50 to-primary/50" />
          </button>
        )}

        {/* Lyrics/Chords button - always visible */}
        <div className={compact ? 'mt-2' : 'mt-3'}>
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
          <div className={compact ? 'mt-2 flex gap-2' : 'mt-3 flex gap-2'}>
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

      {hasDedication && (
        <DedicationExpandDialog
          open={dedicationDialogOpen}
          onOpenChange={setDedicationDialogOpen}
          dedicationText={reservation.dedication_message || ''}
          senderName={reservation.customer_name}
          songTitle={reservation.song_title}
          songArtist={reservation.song_artist}
        />
      )}
    </>
  );
};
