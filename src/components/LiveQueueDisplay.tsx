import React, { useRef, useEffect, useState } from 'react';
import { Music, FileText, Users, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getLyricsSearchUrl } from '@/lib/whatsapp';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  maxVisible?: number;
}

/**
 * LiveQueueDisplay - Mostra la scaletta delle canzoni prenotate
 * agli utenti durante l'evento live.
 * 
 * Features:
 * - Ordine cronologico (prima prenotata = prima in coda)
 * - Pulsante "Testo" sempre visibile
 * - Auto-scroll per liste lunghe
 * - Collapsible per liste molto lunghe
 */
export const LiveQueueDisplay: React.FC<LiveQueueDisplayProps> = ({ 
  songs, 
  className,
  maxVisible = 5 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Filter and sort songs: only in_progress, sorted by created_at (oldest first)
  const activeSongs = songs
    .filter(s => s.status === 'in_progress')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  
  const showExpandButton = activeSongs.length > maxVisible;
  const displayedSongs = isExpanded ? activeSongs : activeSongs.slice(0, maxVisible);
  const hiddenCount = activeSongs.length - maxVisible;

  // Auto-scroll to show newest song when added
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeSongs.length, isExpanded]);
  
  if (activeSongs.length === 0) {
    return null;
  }

  const handleLyrics = (title: string, artist: string) => {
    window.open(getLyricsSearchUrl(title, artist), '_blank');
  };

  return (
    <div className={cn("rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-secondary/10 border-b border-secondary/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-secondary/20">
            <Users className="w-4 h-4 text-secondary" />
          </div>
          <h3 className="font-display font-bold text-foreground text-sm">
            Scaletta Live
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/20 text-secondary text-xs font-medium">
          <Music className="w-3 h-3" />
          {activeSongs.length} {activeSongs.length === 1 ? 'canzone' : 'canzoni'}
        </span>
      </div>

      {/* Queue list */}
      <div 
        ref={scrollRef}
        className={cn(
          "divide-y divide-border/50",
          isExpanded && activeSongs.length > 8 && "max-h-[400px] overflow-y-auto"
        )}
      >
        {displayedSongs.map((song, index) => (
          <div
            key={song.song_key}
            className={cn(
              "flex items-center gap-3 p-3 transition-all",
              index === 0 && "bg-primary/5"
            )}
          >
            {/* Position indicator */}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",
              index === 0 
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" 
                : "bg-muted text-muted-foreground"
            )}>
              {index + 1}
            </div>

            {/* Song info */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-semibold text-sm truncate",
                index === 0 ? "text-foreground" : "text-muted-foreground"
              )}>
                {song.song_title}
              </p>
              <p className="text-xs text-muted-foreground/70 truncate">
                {song.song_artist}
              </p>
            </div>

            {/* Lyrics button - always visible */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLyrics(song.song_title, song.song_artist)}
              className={cn(
                "flex-shrink-0 h-9 px-3 gap-1.5",
                "text-secondary hover:text-secondary hover:bg-secondary/10",
                "border border-secondary/20"
              )}
            >
              <FileText className="w-4 h-4" />
              <span className="text-xs hidden sm:inline">Testo</span>
            </Button>

            {/* "Next" badge for first song */}
            {index === 0 && (
              <span className="flex-shrink-0 px-2.5 py-1 text-xs font-bold rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span className="hidden sm:inline">Prossima</span>
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Expand/Collapse button */}
      {showExpandButton && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-secondary hover:bg-secondary/5 border-t border-border/50 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Mostra meno
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Mostra altre {hiddenCount} {hiddenCount === 1 ? 'canzone' : 'canzoni'}
            </>
          )}
        </button>
      )}

      {/* Tip - only on mobile */}
      <div className="sm:hidden px-4 py-2 bg-muted/30 text-center">
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          <FileText className="w-3 h-3" />
          Tocca "Testo" per cercare i lyrics
        </p>
      </div>
    </div>
  );
};