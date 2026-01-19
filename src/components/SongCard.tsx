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
        className="glass-card p-3 md:p-4 transition-all duration-300 hover:scale-[1.02] hover:neon-glow-pink group"
      >
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0 group-hover:from-primary/40 group-hover:to-secondary/40 transition-all">
            <Music className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-foreground text-xs md:text-base leading-tight line-clamp-1">
              {song.title}
            </h3>
            <p className="text-muted-foreground text-[10px] md:text-sm leading-tight line-clamp-1">
              {song.artist}
            </p>
          </div>

          <div className="flex gap-1.5 md:gap-2 flex-shrink-0">
            <Button
              onClick={() => onBook(song)}
              className="neon-button-pink text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-3"
              size="sm"
            >
              <MessageCircle className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
              <span className="hidden md:inline">Prenota</span>
            </Button>

            <Button
              onClick={handleLyrics}
              variant="outline"
              className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-3 transition-all"
              size="sm"
            >
              <FileText className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
              <span className="hidden md:inline">Testo</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

SongCard.displayName = 'SongCard';
