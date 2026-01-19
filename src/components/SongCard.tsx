import React, { forwardRef } from 'react';
import { Music, MessageCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Song } from '@/data/songs';
import { getLyricsSearchUrl } from '@/lib/whatsapp';

interface SongCardProps {
  song: Song;
  onBook: (song: Song) => void;
}

export const SongCard = forwardRef<HTMLDivElement, SongCardProps>(
  ({ song, onBook }, ref) => {
    const handleLyrics = () => {
      window.open(getLyricsSearchUrl(song.title, song.artist), '_blank');
    };

    return (
      <div
        ref={ref}
        className="glass-card p-4 transition-all duration-300 hover:scale-[1.02] hover:neon-glow-pink group"
      >
        {/* Mobile: Stack layout, Desktop: Row layout */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Icon and song info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0 group-hover:from-primary/40 group-hover:to-secondary/40 transition-all">
              <Music className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-foreground text-sm md:text-base leading-tight line-clamp-2">
                {song.title}
              </h3>
              <p className="text-muted-foreground text-xs md:text-sm leading-tight line-clamp-1 mt-0.5">
                {song.artist}
              </p>
            </div>
          </div>

          {/* Buttons - Full width on mobile */}
          <div className="flex gap-2 sm:gap-3 flex-shrink-0 mt-2 sm:mt-0">
            <Button
              onClick={() => onBook(song)}
              className="neon-button-pink flex-1 sm:flex-initial h-11 sm:h-10 px-4 text-sm font-semibold"
              size="default"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              <span>Prenota</span>
            </Button>

            <Button
              onClick={handleLyrics}
              variant="outline"
              className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground flex-1 sm:flex-initial h-11 sm:h-10 px-4 text-sm font-semibold transition-all"
              size="default"
            >
              <FileText className="w-5 h-5 mr-2" />
              <span>Testo</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

SongCard.displayName = 'SongCard';
