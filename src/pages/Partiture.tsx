import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { Guitar, Music, Wifi, WifiOff, Footprints, Minus, Plus, Eye, EyeOff, Highlighter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useHybridBroadcast } from '@/hooks/useHybridBroadcast';
import { supabase } from '@/integrations/supabase/client';
import { parseChordPro, transposeSong, ChordProSong } from '@/lib/chordpro';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';
import { usePedalScroll } from '@/hooks/usePedalControl';
import { cn } from '@/lib/utils';

interface SongbookFile {
  id: string;
  title: string;
  artist: string | null;
  content: string;
}

import { renderResponsiveSong } from '@/lib/chordproRenderer';

export default function Partiture() {
  const { session, isLocalMode, localConnected, localRequestSong } = useHybridBroadcast('main');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<SongbookFile | null>(null);
  const [localTextScale, setLocalTextScale] = useState<number>(() => {
    const saved = safeGetItem('local', 'partiture_text_scale');
    const val = saved ? parseInt(saved, 10) : 100;
    return val >= 50 && val <= 200 ? val : 100;
  });

  // "Segui" toggle — default from session, local override persisted
  const remoteFollow = (session as any)?.partiture_follow ?? true;
  const [localFollowOverride, setLocalFollowOverride] = useState<boolean | null>(() => {
    const saved = safeGetItem('local', 'partiture_follow_override');
    return saved !== null ? saved === 'true' : null;
  });
  const followMode = localFollowOverride !== null ? localFollowOverride : remoteFollow;

  const handleFollowToggle = useCallback((enabled: boolean) => {
    setLocalFollowOverride(enabled);
    safeSetItem('local', 'partiture_follow_override', enabled ? 'true' : 'false');
  }, []);

  // "Dim inactive lines" — default from session, local override persisted
  const remoteDimInactive = (session as any)?.partiture_dim_inactive ?? false;
  const [localDimOverride, setLocalDimOverride] = useState<boolean | null>(() => {
    const saved = safeGetItem('local', 'partiture_dim_override');
    return saved !== null ? saved === 'true' : null;
  });
  const dimInactive = localDimOverride !== null ? localDimOverride : remoteDimInactive;

  const handleDimToggle = useCallback((enabled: boolean) => {
    setLocalDimOverride(enabled);
    safeSetItem('local', 'partiture_dim_override', enabled ? 'true' : 'false');
  }, []);

  // "Highlight on Partiture" — from session, local override
  const remoteHighlightOn = (session as any)?.partiture_highlight ?? true;
  const [localHighlightOverride, setLocalHighlightOverride] = useState<boolean | null>(() => {
    const saved = safeGetItem('local', 'partiture_highlight_override');
    return saved !== null ? saved === 'true' : null;
  });
  const showHighlight = localHighlightOverride !== null ? localHighlightOverride : remoteHighlightOn;

  const handleHighlightToggle = useCallback((enabled: boolean) => {
    setLocalHighlightOverride(enabled);
    safeSetItem('local', 'partiture_highlight_override', enabled ? 'true' : 'false');
  }, []);
  const broadcastToPartiture = (session as any)?.broadcast_to_partiture ?? true;
  const isDualBroadcast = !!(session as any)?.dual_broadcast;
  // Show content in both normal songbook mode AND dual mode
  const isSongbookLive = (!!(session as any)?.songbook_mode && broadcastToPartiture) || isDualBroadcast;
  const fileId = (session as any)?.songbook_file_id;
  const remoteTranspose = (session as any)?.songbook_transpose ?? 0;
  const remoteHighlightLine = (session as any)?.highlight_line ?? 0;
  const highlightLinesCount = (session as any)?.highlight_lines_count ?? 2;
  const baseFontSize = (session as any)?.font_size ?? 100;
  const fontSize = baseFontSize * localTextScale / 100;

  // Pedal control
  const { isActive: pedalActive } = usePedalScroll({
    page: 'partiture',
    scrollRef: scrollRef as React.RefObject<HTMLElement>,
  });

  // Fetch file when fileId changes — Fallback chain: Cloud → WS Cache → LAN HTTP → IndexedDB
  useEffect(() => {
    if (!fileId) { setFile(null); return; }
    
    const fetchFile = async () => {
      const lip = safeGetItem('local', 'broadcast_local_ip') || '';

      const cloudPromise = (async (): Promise<SongbookFile | null> => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          const { data } = await supabase.from('songbook_files').select('id, title, artist, content').eq('id', fileId).abortSignal(controller.signal).single();
          clearTimeout(timeout);
          return data as SongbookFile | null;
        } catch {
          return null;
        }
      })();

      const wsPromise = isLocalMode ? localRequestSong(fileId, 2000) : Promise.resolve(null);

      const lanPromise = (async (): Promise<SongbookFile | null> => {
        if (!lip) return null;
        try {
          const resp = await fetch(`http://${lip}:8080/api/songbook/${fileId}`, {
            signal: AbortSignal.timeout(3000),
          });
          if (resp.ok) {
            const ct = resp.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
              const f = await resp.json();
              if (f?.content) return { id: f.id || fileId, title: f.title || '', artist: f.artist || null, content: f.content };
            }
          }
          return null;
        } catch {
          return null;
        }
      })();

      const results = await Promise.allSettled([cloudPromise, wsPromise, lanPromise]);
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
          const v = r.value as any;
          setFile({ id: v.id || fileId, title: v.title || '', artist: v.artist || null, content: v.content });
          return;
        }
      }

      const { getCachedFile } = await import('@/lib/songbookCache');
      const cached = await getCachedFile(fileId);
      if (cached) {
        setFile({ id: cached.id, title: cached.title, artist: cached.artist, content: cached.content });
      }
    };

    fetchFile();
  }, [fileId, isLocalMode, localRequestSong]);

  // Parse and transpose
  const parsedSong = useMemo(() => {
    if (!file) return null;
    return transposeSong(parseChordPro(file.content), remoteTranspose);
  }, [file, remoteTranspose]);

  // Sync scroll from broadcast session using highlight_line — only when followMode is ON
  const scrollAnimRef = useRef<number | null>(null);
  useEffect(() => {
    if (!scrollRef.current || !isSongbookLive || !followMode) return;
    const container = scrollRef.current;
    
    const firstEl = container.querySelector(`[data-line="${remoteHighlightLine}"]`) as HTMLElement;
    if (!firstEl) return;

    const lastHighlightIdx = remoteHighlightLine + highlightLinesCount - 1;
    const lastEl = container.querySelector(`[data-line="${lastHighlightIdx}"]`) as HTMLElement;

    const groupTop = firstEl.offsetTop;
    const groupBottom = lastEl 
      ? lastEl.offsetTop + lastEl.offsetHeight 
      : firstEl.offsetTop + firstEl.offsetHeight;
    const groupCenter = (groupTop + groupBottom) / 2;
    const target = Math.max(0, groupCenter - container.clientHeight / 2);

    if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);
    const startPos = container.scrollTop;
    const distance = target - startPos;
    if (Math.abs(distance) < 2) { container.scrollTop = target; return; }
    const duration = Math.min(120, Math.abs(distance) * 0.5);
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      container.scrollTop = startPos + distance * eased;
      if (progress < 1) scrollAnimRef.current = requestAnimationFrame(animate);
    };
    scrollAnimRef.current = requestAnimationFrame(animate);
    return () => { if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current); };
  }, [remoteHighlightLine, isSongbookLive, followMode, highlightLinesCount]);

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
          {isLocalMode && localConnected ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              Connesso via LAN
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              In attesa della trasmissione
            </>
          )}
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
            {isDualBroadcast && (
              <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                Duale
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
        {/* Controls row: Segui + Oscura + text scale */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 flex-wrap gap-2">
          {/* Segui toggle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Switch
                id="follow-mode"
                checked={followMode}
                onCheckedChange={handleFollowToggle}
                className="data-[state=checked]:bg-primary"
              />
              <Label htmlFor="follow-mode" className="text-xs font-medium cursor-pointer flex items-center gap-1">
                {followMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                Segui
              </Label>
            </div>
            <div className="flex items-center gap-1.5">
              <Switch
                id="dim-mode"
                checked={dimInactive}
                onCheckedChange={handleDimToggle}
                className="data-[state=checked]:bg-primary"
              />
              <Label htmlFor="dim-mode" className="text-xs font-medium cursor-pointer">
                Oscura
              </Label>
            </div>
            <div className="flex items-center gap-1.5">
              <Switch
                id="highlight-mode"
                checked={showHighlight}
                onCheckedChange={handleHighlightToggle}
                className="data-[state=checked]:bg-primary"
              />
              <Label htmlFor="highlight-mode" className="text-xs font-medium cursor-pointer flex items-center gap-1">
                <Highlighter className="w-3.5 h-3.5" />
              </Label>
            </div>
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
                const v = Math.min(300, localTextScale + 10);
                setLocalTextScale(v);
                safeSetItem('local', 'partiture_text_scale', String(v));
              }}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Song content - synced scroll with highlight */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto px-4 py-6"
      >
        {parsedSong && (
          <div
            className="font-mono whitespace-pre-wrap leading-relaxed text-foreground"
            style={{ fontSize: `${Math.max(12, 14 * fontSize / 100)}px`, overflowWrap: 'break-word', wordBreak: 'keep-all' as const }}
          >
            {parsedSong.lines.map((line, idx) => {
              const isHighlighted = showHighlight && idx >= remoteHighlightLine && idx < remoteHighlightLine + highlightLinesCount;
              
              if (line.type === 'directive') {
                const sectionLabel = line.directiveValue || line.directiveKey || '';
                if (!sectionLabel) return <div key={idx} data-line={idx} />;
                return (
                  <div
                    key={idx}
                    data-line={idx}
                    className={cn(
                      "font-bold text-primary/80 mt-4 mb-1 transition-opacity duration-150",
                      !isHighlighted && dimInactive && "opacity-40"
                    )}
                  >
                    [{sectionLabel}]
                  </div>
                );
              }
              
              if (line.type === 'empty') {
                return <div key={idx} data-line={idx} className="h-3" />;
              }

              // chord-text or text lines
              return (
                <div
                  key={idx}
                  data-line={idx}
                  className={cn(
                    "transition-opacity duration-150 relative",
                    isHighlighted 
                      ? "opacity-100 bg-primary/10 rounded px-1 -mx-1 border-l-2 border-primary" 
                      : dimInactive ? "opacity-40" : "opacity-100"
                  )}
                >
                  {line.chords && line.chords.length > 0 && (
                    <div className="text-primary font-bold leading-tight">
                      {(() => {
                        let chordLine = '';
                        for (const { chord, position } of line.chords) {
                          while (chordLine.length < position) chordLine += ' ';
                          chordLine += chord;
                        }
                        return chordLine;
                      })()}
                    </div>
                  )}
                  <div>{line.text || '\u00A0'}</div>
                </div>
              );
            })}
            {/* Extra space at bottom for scroll */}
            <div className="h-[50vh]" />
          </div>
        )}
      </div>
    </div>
  );
}