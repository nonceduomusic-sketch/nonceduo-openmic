import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Guitar, Music, Wifi, WifiOff, Footprints } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useBroadcast } from '@/hooks/useBroadcast';
import { supabase } from '@/integrations/supabase/client';
import { parseChordPro, transposeSong, ChordProSong } from '@/lib/chordpro';
// highlight_line based sync - no longer needs scrollRatio
import { usePedalScroll } from '@/hooks/usePedalControl';

interface SongbookFile {
  id: string;
  title: string;
  artist: string | null;
  content: string;
}

function renderColoredChords(song: ChordProSong): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  song.lines.forEach((line, index) => {
    if (line.type === 'empty') { result.push(<div key={`e-${index}`} data-line={index} className="h-4" />); return; }
    if (line.type === 'comment' || line.type === 'directive') return;
    if (line.type === 'text') { result.push(<div key={`t-${index}`} data-line={index}>{line.text}</div>); return; }
    if (line.type === 'chord-text' && line.chords?.length) {
      result.push(
        <div key={`ct-${index}`} data-line={index}>
          <div className="text-primary font-bold whitespace-pre">
            {line.chords.map((c, i) => {
              const spaces = i === 0 ? c.position : c.position - (line.chords![i - 1].position + line.chords![i - 1].chord.length);
              return (
                <React.Fragment key={i}>
                  {' '.repeat(Math.max(0, spaces))}
                  <span className="text-primary">{c.chord}</span>
                </React.Fragment>
              );
            })}
          </div>
          <div>{line.text}</div>
        </div>
      );
    }
  });
  return result;
}

export default function Partiture() {
  const { session } = useBroadcast('main');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<SongbookFile | null>(null);

  const isSongbookLive = !!(session as any)?.songbook_mode && !!(session as any)?.is_broadcasting;
  const fileId = (session as any)?.songbook_file_id;
  const remoteTranspose = (session as any)?.songbook_transpose ?? 0;
  const remoteHighlightLine = (session as any)?.highlight_line ?? 0;
  const fontSize = (session as any)?.font_size ?? 100;

  // Pedal control
  const { isActive: pedalActive } = usePedalScroll({
    page: 'partiture',
    scrollRef: scrollRef as React.RefObject<HTMLElement>,
  });

  // Fetch file when fileId changes
  useEffect(() => {
    if (!fileId) { setFile(null); return; }
    supabase.from('songbook_files').select('*').eq('id', fileId).single()
      .then(({ data }) => {
        if (data) setFile(data as SongbookFile);
      });
  }, [fileId]);

  // Parse and transpose
  const parsedSong = useMemo(() => {
    if (!file) return null;
    return transposeSong(parseChordPro(file.content), remoteTranspose);
  }, [file, remoteTranspose]);

  // Sync scroll from broadcast session using highlight_line for cross-view text alignment
  useEffect(() => {
    if (!scrollRef.current || !isSongbookLive) return;
    const el = scrollRef.current.querySelector(`[data-line="${remoteHighlightLine}"]`) as HTMLElement;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [remoteHighlightLine, isSongbookLive]);

  // Waiting state
  if (!isSongbookLive || !file) {
    return (
      <div className="h-[100dvh] bg-background flex flex-col items-center justify-center gap-8 p-8">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
            <Guitar className="w-12 h-12 text-primary" />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-muted-foreground/30 animate-pulse" />
        </div>
        <div className="text-center space-y-3 max-w-md">
          <h1 className="text-3xl font-bold tracking-tight">Partiture Live</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            In attesa che la trasmissione inizi...
          </p>
          <p className="text-muted-foreground/70 text-sm">
            Quando il direttore avvia un brano da SongBook Live, gli accordi e il testo appariranno qui in tempo reale, sincronizzati con la TV.
          </p>
        </div>
        <Badge variant="outline" className="gap-2 px-5 py-2.5 text-sm">
          <WifiOff className="w-4 h-4" />
          In attesa della trasmissione
        </Badge>
        <div className="flex items-center gap-6 text-xs text-muted-foreground/50 mt-4">
          <div className="flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5" />
            <span>Accordi + Testo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5" />
            <span>Sync in tempo reale</span>
          </div>
          {pedalActive && (
            <div className="flex items-center gap-1.5">
              <Footprints className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary">Pedale attivo</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Music className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base truncate">{file.title}</h1>
              {file.artist && (
                <p className="text-xs text-muted-foreground truncate">{file.artist}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {remoteTranspose !== 0 && (
              <Badge variant="secondary" className="text-xs">
                {remoteTranspose > 0 ? '+' : ''}{remoteTranspose}
              </Badge>
            )}
            {pedalActive && (
              <Badge variant="outline" className="text-xs text-primary border-primary/50">
                <Footprints className="w-3 h-3 mr-1" />
                Pedale
              </Badge>
            )}
            <Badge className="bg-destructive text-destructive-foreground animate-pulse">
              <Wifi className="w-3 h-3 mr-1" />
              LIVE
            </Badge>
          </div>
        </div>
      </header>

      {/* Song content - synced scroll */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto px-4 py-6"
      >
        {parsedSong && (
          <div
            className="font-mono whitespace-pre-wrap leading-relaxed text-foreground"
            style={{ fontSize: `${Math.max(12, 14 * fontSize / 100)}px` }}
          >
            {renderColoredChords(parsedSong)}
          </div>
        )}
      </div>

    </div>
  );
}
