import React, { forwardRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, MessageCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Song } from '@/data/songs';
import { openLyrics } from '@/lib/lyricsLookup';

interface SongCardProps {
  song: Song;
  onBook: (song: Song) => void;
}

export const SongCard = forwardRef<HTMLDivElement, SongCardProps>(
  ({ song, onBook }, ref) => {
    const navigate = useNavigate();
    
    const handleLyrics = useCallback(async () => {
      await openLyrics(song.title, song.artist, navigate);
    }, [song.title, song.artist, navigate]);

    return (
      <div
        ref={ref}
        className="glass-card p-3 sm:p-4 lg:p-4 transition-all duration-300 hover:scale-[1.02] hover:neon-glow-pink group"
      >
        {/* Mobile: Stack layout, Tablet: Optimized row, Desktop: Full row */}
        <div className="flex flex-col gap-3">
          {/* Icon and song info */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0 group-hover:from-primary/40 group-hover:to-secondary/40 transition-all">
              <Music className="w-5 h-5 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary" />
            </div>

            <div className="flex-1 min-w-0 py-0.5">
              <h3 className="font-display font-semibold text-foreground text-sm sm:text-base lg:text-base leading-snug break-words">
                {song.title}
              </h3>
              <p className="text-muted-foreground text-xs sm:text-sm lg:text-sm leading-snug mt-1 break-words">
                {song.artist}
              </p>
            </div>
          </div>

          {/* Buttons - Always full width for consistency */}
          <div className="flex gap-2">
            <Button
              onClick={() => onBook(song)}
              className="neon-button-pink flex-1 h-10 sm:h-11 lg:h-10 px-3 sm:px-4 text-xs sm:text-sm font-semibold"
              size="default"
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 flex-shrink-0" />
              <span>Prenota</span>
            </Button>

            <Button
              onClick={handleLyrics}
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

SongCard.displayName = 'SongCard';
