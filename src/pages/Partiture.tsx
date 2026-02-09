import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Guitar, Music, Wifi, WifiOff, Minus, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useBroadcast } from '@/hooks/useBroadcast';
import { supabase } from '@/integrations/supabase/client';
import { parseChordPro, transposeSong, ChordProSong } from '@/lib/chordpro';
import { scrollElementToRatio } from '@/lib/scrollRatio';

interface SongbookFile {
  id: string;
  title: string;
  artist: string | null;
  content: string;
}

function renderColoredChords(song: ChordProSong): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let lineIndex = 0;
  for (const line of song.lines) {
    if (line.type === 'empty') { result.push(<div key={`e-${lineIndex++}`} className="h-4" />); continue; }
    if (line.type === 'comment' || line.type === 'directive') continue;
    if (line.type === 'text') { result.push(<div key={`t-${lineIndex++}`}>{line.text}</div>); continue; }
    if (line.type === 'chord-text' && line.chords?.length) {
      result.push(
        <div key={`c-${lineIndex}`} className="text-primary font-bold whitespace-pre">
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
      );
      result.push(<div key={`t-${lineIndex++}`}>{line.text}</div>);
    }
  }
  return result;
}

export default function Partiture() {
  const { session } = useBroadcast('main');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<SongbookFile | null>(null);
  const [localTranspose, setLocalTranspose] = useState(0);

  const isSongbookLive = !!(session as any)?.songbook_mode && !!(session as any)?.is_broadcasting;
  const fileId = (session as any)?.songbook_file_id;
  const remoteTranspose = (session as any)?.songbook_transpose ?? 0;
  const scrollPosition = (session as any)?.scroll_position ?? 0;
  const fontSize = (session as any)?.font_size ?? 100;

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
    return transposeSong(parseChordPro(file.content), remoteTranspose + localTranspose);
  }, [file, remoteTranspose, localTranspose]);

  // Sync scroll from broadcast session
  useEffect(() => {
    if (!scrollRef.current || !isSongbookLive) return;
    scrollElementToRatio(scrollRef.current, scrollPosition);
  }, [scrollPosition, isSongbookLive]);

  const handleLocalTranspose = (delta: number) => {
    setLocalTranspose(prev => {
      const v = prev + delta;
      if (v > 11) return v - 12;
      if (v < -11) return v + 12;
      return v;
    });
  };

  // Waiting state
  if (!isSongbookLive || !file) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-6 p-8">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Guitar className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Partiture Live</h1>
          <p className="text-muted-foreground max-w-sm">
            In attesa che la trasmissione inizi... Quando il direttore avvia un brano, gli accordi appariranno qui in tempo reale.
          </p>
        </div>
        <Badge variant="outline" className="gap-2 px-4 py-2">
          <WifiOff className="w-4 h-4" />
          In attesa
        </Badge>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
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
            {(remoteTranspose + localTranspose) !== 0 && (
              <Badge variant="secondary" className="text-xs">
                {(remoteTranspose + localTranspose) > 0 ? '+' : ''}{remoteTranspose + localTranspose}
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

      {/* Bottom bar - local transpose only */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t px-4 py-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Tonalità locale</Label>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleLocalTranspose(-1)}>
              <Minus className="w-4 h-4" />
            </Button>
            <span className="w-12 text-center font-mono text-sm">
              {localTranspose > 0 ? '+' : ''}{localTranspose}
            </span>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleLocalTranspose(1)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
