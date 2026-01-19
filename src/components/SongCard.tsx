import React from 'react';
import { Music, MessageCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Song } from '@/data/songs';
import { getLyricsSearchUrl } from '@/lib/whatsapp';

interface SongCardProps {
  song: Song;
  onBook: (song: Song) => void;
}

export const SongCard: React.FC<SongCardProps> = ({ song, onBook }) => {
  const handleLyrics = () => {
    window.open(getLyricsSearchUrl(song.title, song.artist), '_blank');
  };

  return (
    <div className="glass-card p-4 transition-all duration-300 hover:scale-[1.02] hover:neon-glow-pink group">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0 group-hover:from-primary/40 group-hover:to-secondary/40 transition-all">
          <Music className="w-5 h-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-foreground text-sm md:text-base truncate">
            {song.title}
          </h3>
          <p className="text-muted-foreground text-xs md:text-sm truncate">
            {song.artist}
          </p>
        </div>
      </div>
      
      <div className="flex gap-2 mt-3">
        <Button
          onClick={() => onBook(song)}
          className="flex-1 neon-button-pink text-xs md:text-sm h-9"
          size="sm"
        >
          <MessageCircle className="w-4 h-4 mr-1" />
          Prenota
        </Button>
        
        <Button
          onClick={handleLyrics}
          variant="outline"
          className="flex-1 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground text-xs md:text-sm h-9 transition-all"
          size="sm"
        >
          <FileText className="w-4 h-4 mr-1" />
          Testo
        </Button>
      </div>
    </div>
  );
};
