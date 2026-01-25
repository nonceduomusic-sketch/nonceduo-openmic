import React from 'react';
import { Music, FileText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getLyricsSearchUrl } from '@/lib/whatsapp';

interface QueueSong {
  song_key: string;
  song_title: string;
  song_artist: string;
  status: 'in_progress' | 'completed';
  created_at: string;
}

interface LiveQueueDisplayProps {
  songs: QueueSong[];
  className?: string;
}

/**
 * LiveQueueDisplay - Mostra la scaletta delle canzoni prenotate
 * agli utenti durante l'evento live.
 * 
 * - Ordine cronologico (prima = prossima)
 * - Pulsante "Testo" per cercare i lyrics
 * - Si aggiorna in tempo reale
 */
export const LiveQueueDisplay: React.FC<LiveQueueDisplayProps> = ({ songs, className }) => {
  const activeSongs = songs.filter(s => s.status === 'in_progress');
  
  if (activeSongs.length === 0) {
    return null;
  }

  const handleLyrics = (title: string, artist: string) => {
    window.open(getLyricsSearchUrl(title, artist), '_blank');
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 text-secondary" />
        <h3 className="font-display font-semibold text-foreground text-sm">
          Scaletta Live
        </h3>
        <span className="text-xs text-muted-foreground">
          ({activeSongs.length} {activeSongs.length === 1 ? 'canzone' : 'canzoni'} in coda)
        </span>
      </div>

      {/* Queue list */}
      <div className="space-y-2">
        {activeSongs.map((song, index) => (
          <div
            key={song.song_key}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-all",
              index === 0 
                ? "bg-primary/10 border-primary/30 shadow-sm" 
                : "bg-muted/30 border-border/50"
            )}
          >
            {/* Position indicator */}
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",
              index === 0 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            )}>
              {index + 1}
            </div>

            {/* Song info */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-medium text-sm truncate",
                index === 0 ? "text-foreground" : "text-muted-foreground"
              )}>
                {song.song_title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {song.song_artist}
              </p>
            </div>

            {/* Lyrics button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLyrics(song.song_title, song.song_artist)}
              className="flex-shrink-0 h-8 px-2 text-secondary hover:text-secondary hover:bg-secondary/10"
            >
              <FileText className="w-4 h-4" />
            </Button>

            {/* Status badge for first song */}
            {index === 0 && (
              <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-primary/20 text-primary border border-primary/30">
                Prossima
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Tip */}
      <p className="text-xs text-muted-foreground text-center mt-2">
        📄 Clicca sull'icona per cercare il testo della canzone
      </p>
    </div>
  );
};
