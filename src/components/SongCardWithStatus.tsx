import React, { forwardRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, FileText, Lock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Song } from '@/data/songs';
import { cn } from '@/lib/utils';
import { openLyrics } from '@/lib/lyricsLookup';

interface SongCardWithStatusProps {
  song: Song;
  onBook: (song: Song) => void;
  isBooked?: boolean;
  isCompleted?: boolean;
}

export const SongCardWithStatus = forwardRef<HTMLDivElement, SongCardWithStatusProps>(
  ({ song, onBook, isBooked = false, isCompleted = false }, ref) => {
    const navigate = useNavigate();

    const handleLyricsClick = useCallback(async () => {
      await openLyrics(song.title, song.artist, navigate);
    }, [song.title, song.artist, navigate]);

    const isAvailable = !isBooked && !isCompleted;

    return (
      <div
        ref={ref}
        className={cn(
          "glass-card p-3 sm:p-4 lg:p-4 transition-all duration-300 group relative",
          isAvailable && "hover:scale-[1.02] hover:neon-glow-pink",
          isBooked && "opacity-70 border-warning/50",
          isCompleted && "opacity-50 border-secondary/30"
        )}
      >
        {/* Status badge */}
        {isBooked && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-warning/20 border border-warning/40 text-warning text-xs font-medium">
            <Lock className="w-3 h-3" />
            <span>Prenotata</span>
          </div>
        )}
        {isCompleted && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/20 border border-secondary/40 text-secondary text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            <span>Cantata</span>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {/* Icon and song info */}
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
              isAvailable && "bg-gradient-to-br from-primary/20 to-secondary/20 group-hover:from-primary/40 group-hover:to-secondary/40",
              isBooked && "bg-warning/20",
              isCompleted && "bg-secondary/20"
            )}>
              <Music className={cn(
                "w-5 h-5 sm:w-5 sm:h-5 lg:w-6 lg:h-6",
                isAvailable && "text-primary",
                isBooked && "text-warning",
                isCompleted && "text-secondary"
              )} />
            </div>

            <div className="flex-1 min-w-0 py-0.5 pr-16">
              <h3 className="font-display font-semibold text-foreground text-sm sm:text-base lg:text-base leading-snug break-words">
                {song.title}
              </h3>
              <p className="text-muted-foreground text-xs sm:text-sm lg:text-sm leading-snug mt-1 break-words">
                {song.artist}
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            {isBooked ? (
              <Button
                disabled
                className="flex-1 h-10 sm:h-11 lg:h-10 px-3 sm:px-4 text-xs sm:text-sm font-semibold bg-warning/20 text-warning border border-warning/40 cursor-not-allowed"
                variant="outline"
              >
                <Lock className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span>Prenotata</span>
              </Button>
            ) : isCompleted ? (
              <Button
                disabled
                className="flex-1 h-10 sm:h-11 lg:h-10 px-3 sm:px-4 text-xs sm:text-sm font-semibold bg-secondary/20 text-secondary border border-secondary/40 cursor-not-allowed"
                variant="outline"
              >
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span>Cantata</span>
              </Button>
            ) : (
              <Button
                onClick={() => onBook(song)}
                className="neon-button-pink flex-1 h-10 sm:h-11 lg:h-10 px-3 sm:px-4 text-xs sm:text-sm font-semibold"
                size="default"
              >
                <Music className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span>Prenota</span>
              </Button>
            )}

            <Button
              onClick={handleLyricsClick}
              variant="outline"
              className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground flex-1 h-10 sm:h-11 lg:h-10 px-3 sm:px-4 text-xs sm:text-sm font-semibold transition-all"
              size="default"
            >
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 flex-shrink-0" />
              <span>Testo</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

SongCardWithStatus.displayName = 'SongCardWithStatus';
