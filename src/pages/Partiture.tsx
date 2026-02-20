import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Guitar, Music, Wifi, WifiOff, Footprints, Minus, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useBroadcast } from '@/hooks/useBroadcast';
import { supabase } from '@/integrations/supabase/client';
import { parseChordPro, transposeSong, ChordProSong } from '@/lib/chordpro';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';
import { usePedalScroll } from '@/hooks/usePedalControl';

interface SongbookFile {
  id: string;
  title: string;
  artist: string | null;
  content: string;
}

import { renderResponsiveSong } from '@/lib/chordproRenderer';

export default function Partiture() {
  const { session } = useBroadcast('main');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<SongbookFile | null>(null);
  const [localTextScale, setLocalTextScale] = useState<number>(() => {
    const saved = safeGetItem('local', 'partiture_text_scale');
    const val = saved ? parseInt(saved, 10) : 100;
    return val >= 50 && val <= 200 ? val : 100;
  });

  const broadcastToPartiture = (session as any)?.broadcast_to_partiture ?? true;
  const isSongbookLive = !!(session as any)?.songbook_mode && broadcastToPartiture;
  const fileId = (session as any)?.songbook_file_id;
  const remoteTranspose = (session as any)?.songbook_transpose ?? 0;
  const remoteHighlightLine = (session as any)?.highlight_line ?? 0;
  const baseFontSize = (session as any)?.font_size ?? 100;
  const fontSize = baseFontSize * localTextScale / 100;

  // Pedal control
  const { isActive: pedalActive } = usePedalScroll({
    page: 'partiture',
    scrollRef: scrollRef as React.RefObject<HTMLElement>,
  });

  // Fetch file when fileId changes — Fallback chain: Cloud → LAN → IndexedDB cache
  useEffect(() => {
    if (!fileId) { setFile(null); return; }
    
    const fetchFile = async () => {
      // 1) Try Cloud — with timeout to avoid hanging offline
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const { data } = await supabase.from('songbook_files').select('*').eq('id', fileId).abortSignal(controller.signal).single();
        clearTimeout(timeout);
        if (data) {
          setFile(data as SongbookFile);
          return;
        }
      } catch {
        console.log('[Partiture] Cloud fetch failed/timeout, trying LAN...');
      }

      // 2) Try LAN mini-server
      const localIP = safeGetItem('local', 'broadcast_local_ip') || '';
      if (localIP) {
        try {
          const resp = await fetch(`http://${localIP}:8080/api/songbook/${fileId}`, {
            signal: AbortSignal.timeout(3000),
          });
          if (resp.ok) {
            const f = await resp.json();
            if (f && f.content) {
              setFile({ id: f.id || fileId, title: f.title || '', artist: f.artist || null, content: f.content });
              return;
            }
          }
        } catch { /* LAN not available */ }
      }

      // 3) Fallback to IndexedDB cache
      const { getCachedFile } = await import('@/lib/songbookCache');
      const cached = await getCachedFile(fileId);
      if (cached) {
        setFile({
          id: cached.id,
          title: cached.title,
          artist: cached.artist,
          content: cached.content,
        } as SongbookFile);
      }
    };

    fetchFile();
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
          {/* Text scale controls */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => {
                const v = Math.max(50, localTextScale - 10);
                setLocalTextScale(v);
                safeSetItem('local', 'partiture_text_scale', String(v));
              }}
            >
              <Minus className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs font-mono w-10 text-center">{localTextScale}%</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => {
                const v = Math.min(200, localTextScale + 10);
                setLocalTextScale(v);
                safeSetItem('local', 'partiture_text_scale', String(v));
              }}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
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
            {renderResponsiveSong(parsedSong, { coloredChords: true })}
          </div>
        )}
      </div>

    </div>
  );
}
