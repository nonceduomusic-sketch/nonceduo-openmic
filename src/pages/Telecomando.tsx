import React, { useState, useEffect, useMemo, useRef, useLayoutEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useBroadcastRemoteUser, useRemoteControl } from "@/hooks/useBroadcastRemote";
import { useHybridBroadcast } from "@/hooks/useHybridBroadcast";
import { useScrollPositionPublisher } from "@/hooks/useScrollPositionPublisher";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronUp, ChevronDown, Eye, Smartphone, WifiOff, AlertTriangle, Lock, Tv, Mic, Server, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import brandLogoText from "@/assets/brand-logo-text.png";
import { parseChordPro, transposeSong } from "@/lib/chordpro";
import { ConnectionSettings } from "@/components/songbook/ConnectionSettings";
import { usePedalControl } from "@/hooks/usePedalControl";

type ViewMode = "preview" | "remote";

export default function Telecomando() {
  const { token } = useParams<{ token: string }>();
  const {
    isValidated,
    accessInfo,
    sessionId,
    loading: authLoading,
    tokenExists,
    isKicked,
    validatePIN,
  } = useBroadcastRemoteUser(token);

  const [pin, setPin] = useState("");
  const [validating, setValidating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("remote");

  useEffect(() => {
    if (isValidated) setViewMode("remote");
  }, [isValidated]);

  const handlePINSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setValidating(true);
    await validatePIN(pin);
    setValidating(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Caricamento...</div>
      </div>
    );
  }

  if (!tokenExists) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Link non valido</h1>
            <p className="text-muted-foreground">Questo link di accesso al telecomando non è valido o è scaduto.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isKicked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <WifiOff className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Disconnesso</h1>
            <p className="text-muted-foreground mb-4">Sei stato disconnesso dal telecomando dall'amministratore.</p>
            <Button onClick={() => window.location.reload()}>Riprova</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <img src={brandLogoText} alt="Logo" className="h-12 mx-auto mb-4" />
            <CardTitle className="text-2xl">Telecomando Trasmissione</CardTitle>
            <p className="text-muted-foreground mt-2">{accessInfo?.name || "Accesso Telecomando"}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePINSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Inserisci PIN
                </label>
                <Input
                  type="text"
                  placeholder="ABC123"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.toUpperCase())}
                  className="text-center text-2xl tracking-widest h-14 font-mono"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full h-12" disabled={validating || pin.length < 4}>
                {validating ? "Verifica..." : "Accedi"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <RemoteControlInterface
      salaCode={accessInfo?.salaCode || "main"}
      sessionId={sessionId}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    />
  );
}

interface RemoteControlInterfaceProps {
  salaCode: string;
  sessionId: string | null;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

function RemoteControlInterface({ salaCode, sessionId, viewMode, onViewModeChange }: RemoteControlInterfaceProps) {
  const { session, syncUpdate, updateSession, mode, setMode, localIP, setLocalIP, localConnected, localLatency, isLocalMode } = useHybridBroadcast(salaCode);
  const { updateScrollPosition } = useRemoteControl(sessionId, salaCode);

  // Hybrid highlight update: use syncUpdate for fastest path (direct DB update or local WS)
  const updateHighlightLine = useCallback(async (line: number) => {
    syncUpdate({ highlight_line: line });
    return true;
  }, [syncUpdate]);

  const [currentSong, setCurrentSong] = useState<{
    titolo: string;
    artista: string;
    testo: string | null;
  } | null>(null);

  // Songbook file state
  const [currentSongbookFile, setCurrentSongbookFile] = useState<{
    title: string;
    artist: string | null;
    content: string;
  } | null>(null);

  const isBroadcasting = (session as any)?.is_broadcasting ?? false;
  const highlightLine = session?.highlight_line ?? 0;
  const highlightEnabled = (session as any)?.highlight_enabled ?? true;
  const highlightLinesCount = (session as any)?.highlight_lines_count ?? 1;
  const remoteScrollEnabled = (session as any)?.remote_scroll_enabled ?? true;
  const fontSize = (session as any)?.font_size ?? 100;
  const textAlign = ((session as any)?.text_align as 'left' | 'center' | 'right') || 'center';

  // Songbook mode detection
  const isSongbookMode = (session as any)?.songbook_mode ?? false;
  const songbookFileId = (session as any)?.songbook_file_id ?? null;
  const songbookTranspose = (session as any)?.songbook_transpose ?? 0;

  // Compute lines: use SAME indexing as Trasmetti.tsx to keep highlight_line in sync
  // For songbook mode: include ALL lines (directives, empties) to match TV indices
  // For catalog: include ALL lines including empty ones to match TV indices
  const lines = useMemo(() => {
    if (isSongbookMode && currentSongbookFile) {
      const parsed = parseChordPro(currentSongbookFile.content);
      const transposed = transposeSong(parsed, songbookTranspose);
      // Return ALL lines to match TV indexing - use text for display
      return transposed.lines.map(l => {
        if (l.type === 'directive' || l.type === 'comment') {
          if (l.directiveKey && ['chorus', 'verse', 'bridge', 'intro', 'outro', 'tab'].includes(l.directiveKey)) {
            return `[${l.directiveValue || l.directiveKey}]`;
          }
          return '';
        }
        if (l.type === 'empty') return '';
        return l.text || '';
      });
    }
    // For catalog songs: split ALL lines (including empty) to match TV indexing
    return currentSong?.testo?.split("\n").filter((line) => line.trim()) || [];
  }, [currentSong?.testo, isSongbookMode, currentSongbookFile, songbookTranspose]);

  // Current title/artist for display
  const displayTitle = isSongbookMode
    ? (currentSongbookFile?.title || "In attesa...")
    : (currentSong?.titolo || "In attesa...");
  const displayArtist = isSongbookMode
    ? (currentSongbookFile?.artist || "")
    : (currentSong?.artista || "");

  // Fetch catalog song
  useEffect(() => {
    if (isSongbookMode) {
      setCurrentSong(null);
      return;
    }
    if (!session?.current_song_id) {
      setCurrentSong(null);
      return;
    }
    const fetchSong = async () => {
      const { data } = await supabase
        .from("songs")
        .select("titolo, artista, testo")
        .eq("id", session.current_song_id)
        .single();
      if (data) setCurrentSong(data);
    };
    fetchSong();
  }, [session?.current_song_id, isSongbookMode]);

  // Fetch songbook file
  useEffect(() => {
    if (!isSongbookMode || !songbookFileId) {
      setCurrentSongbookFile(null);
      return;
    }
    const fetchFile = async () => {
      const { data } = await supabase
        .from("songbook_files")
        .select("title, artist, content")
        .eq("id", songbookFileId)
        .single();
      if (data) setCurrentSongbookFile(data);
    };
    fetchFile();
  }, [isSongbookMode, songbookFileId]);

  // Determine if we have content to show
  const hasContent = isSongbookMode ? !!currentSongbookFile : !!currentSong;

  // Pedal control: highlight mode (advances highlight_line like Avanti/Indietro)
  const { isActive: pedalActive } = usePedalControl({
    page: 'telecomando',
    highlightLine,
    totalLines: lines.length || 1,
    onLineChange: (newLine) => {
      if (remoteScrollEnabled) {
        updateHighlightLine(newLine);
      }
    },
    disabled: !remoteScrollEnabled,
  });

  const scrollUp = async () => {
    if (!remoteScrollEnabled) return;
    const newLine = Math.max(0, highlightLine - 1);
    await updateHighlightLine(newLine);
  };

  const scrollDown = async () => {
    if (!remoteScrollEnabled) return;
    const newLine = Math.min(lines.length - 1, highlightLine + 1);
    await updateHighlightLine(newLine);
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-background flex flex-col">
      <header className="flex-shrink-0 border-b bg-card/50 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn("w-2.5 h-2.5 rounded-full", isBroadcasting ? "bg-green-500 animate-pulse" : "bg-muted")}
            />
            <div className="min-w-0">
              <h1 className="font-semibold truncate text-sm">{displayTitle}</h1>
              {displayArtist && <p className="text-xs text-muted-foreground truncate">{displayArtist}</p>}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <ConnectionSettings
              mode={mode}
              setMode={setMode}
              localIP={localIP}
              setLocalIP={setLocalIP}
              isLocalConnected={localConnected}
              localLatency={localLatency}
            />
            {!remoteScrollEnabled && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-500/50 text-xs">
                Solo lettura
              </Badge>
            )}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === "preview" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-3"
                onClick={() => onViewModeChange("preview")}
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "remote" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-3"
                onClick={() => onViewModeChange("remote")}
              >
                <Smartphone className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden">
        {viewMode === "preview" ? (
          <PreviewWithControls
            lines={lines}
            highlightLine={highlightLine}
            highlightEnabled={highlightEnabled}
            highlightLinesCount={highlightLinesCount}
            isBroadcasting={isBroadcasting}
            hasContent={hasContent}
            remoteScrollEnabled={remoteScrollEnabled}
            fontSize={fontSize}
            textAlign={textAlign}
            onScrollUp={scrollUp}
            onScrollDown={scrollDown}
            onScrollToLine={(index) => updateHighlightLine(index)}
            onScrollPositionChange={(ratio) => updateScrollPosition(ratio)}
          />
        ) : (
          <RemoteOnlyControls
            lines={lines}
            highlightLine={highlightLine}
            highlightEnabled={highlightEnabled}
            highlightLinesCount={highlightLinesCount}
            isBroadcasting={isBroadcasting}
            hasContent={hasContent}
            remoteScrollEnabled={remoteScrollEnabled}
            fontSize={fontSize}
            textAlign={textAlign}
            onScrollUp={scrollUp}
            onScrollDown={scrollDown}
            onScrollPositionChange={(ratio) => updateScrollPosition(ratio)}
          />
        )}
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────
//           PAGINA 1: Preview – righe cliccabili + pulsanti piccoli
// ──────────────────────────────────────────────
function PreviewWithControls({
  lines,
  highlightLine,
  highlightEnabled,
  highlightLinesCount,
  isBroadcasting,
  hasContent,
  remoteScrollEnabled,
  fontSize,
  textAlign,
  onScrollUp,
  onScrollDown,
  onScrollToLine,
  onScrollPositionChange,
}: {
  lines: string[];
  highlightLine: number;
  highlightEnabled: boolean;
  highlightLinesCount: number;
  isBroadcasting: boolean;
  hasContent: boolean;
  remoteScrollEnabled: boolean;
  fontSize: number;
  textAlign: 'left' | 'center' | 'right';
  onScrollUp: () => void | Promise<void>;
  onScrollDown: () => void | Promise<void>;
  onScrollToLine: (index: number) => void | Promise<unknown>;
  onScrollPositionChange?: (ratio: number) => void | Promise<unknown>;
}) {
  const lyricsRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const [controlsHeight, setControlsHeight] = useState(0);

  useLayoutEffect(() => {
    const el = controlsRef.current;
    if (!el) return;
    const update = () => setControlsHeight(el.offsetHeight || 100);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { onScroll: onLyricsScroll } = useScrollPositionPublisher({
    enabled: remoteScrollEnabled,
    publish: (ratio) => onScrollPositionChange?.(ratio),
  });

  // Auto-scroll only when highlight is enabled
  useLayoutEffect(() => {
    if (!lyricsRef.current || !isBroadcasting || !highlightEnabled) return;

    const container = lyricsRef.current;
    const activeEl = container.querySelector(`[data-line="${highlightLine}"]`) as HTMLElement | null;

    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightLine, isBroadcasting, highlightEnabled]);

  if (!isBroadcasting || !hasContent || lines.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center p-6">
        <div>
          <Tv className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isBroadcasting ? "Nessun testo disponibile" : "Trasmissione non attiva"}
          </p>
          <p className="text-sm text-muted-foreground/70 mt-2">In attesa che l'admin avvii la trasmissione...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div
        ref={lyricsRef}
        onScroll={(e) => onLyricsScroll(e.currentTarget)}
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{
          paddingBottom: controlsHeight > 0 ? controlsHeight + 120 : 260,
        }}
      >
        <div className={cn(
          "space-y-2 max-w-lg mx-auto",
          textAlign === 'left' && 'text-left',
          textAlign === 'center' && 'text-center',
          textAlign === 'right' && 'text-right'
        )}>
          {lines.map((line, index) => {
            const isMainHighlight = highlightLine === index;
            const distanceFromMain = index - highlightLine;
            const isInHighlightRange = distanceFromMain >= 0 && distanceFromMain < highlightLinesCount;
            const isPast = index < highlightLine;
            // When highlight is OFF, all lines fully visible
            const opacity = highlightEnabled 
              ? (isMainHighlight ? 1 : isInHighlightRange ? 0.9 : isPast ? 0.5 : 0.8) 
              : 1;
            const baseFontSize = Math.max(14, 16 * fontSize / 100);
            // Skip empty lines in display but keep index for sync
            if (!line && !isInHighlightRange && !isMainHighlight) {
              return <div key={index} data-line={index} className="h-2" />;
            }
            return (
              <button
                key={index}
                data-line={index}
                onClick={() => remoteScrollEnabled && onScrollToLine(index)}
                disabled={!remoteScrollEnabled}
                className={cn(
                  "w-full px-3 py-2 rounded-lg transition-all",
                  "leading-relaxed",
                  highlightEnabled && isMainHighlight && "bg-primary/20 text-primary font-semibold ring-2 ring-primary/50",
                  highlightEnabled && isInHighlightRange && !isMainHighlight && "bg-primary/10 text-primary/80 ring-1 ring-primary/30",
                  !isInHighlightRange && !isMainHighlight && remoteScrollEnabled && "hover:bg-muted",
                  !remoteScrollEnabled && "cursor-default",
                )}
                style={{ opacity, fontSize: `${baseFontSize}px` }}
              >
                {line || "\u00A0"}
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={controlsRef}
        className="fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur-xl p-4 pb-[max(24px,env(safe-area-inset-bottom))] z-50"
      >
        <div className="flex items-center justify-center gap-6 max-w-md mx-auto">
          <Button
            size="lg"
            variant="outline"
            className="h-16 w-16 rounded-full"
            onClick={onScrollUp}
            disabled={highlightLine === 0 || !remoteScrollEnabled}
          >
            <ChevronUp className="w-6 h-6" />
          </Button>

          <div className="text-center min-w-[100px]">
            <div className="text-2xl font-bold tabular-nums">{highlightLine + 1}</div>
            <div className="text-xs text-muted-foreground">di {lines.length}</div>
          </div>

          <Button
            size="lg"
            variant="outline"
            className="h-16 w-16 rounded-full"
            onClick={onScrollDown}
            disabled={highlightLine >= lines.length - 1 || !remoteScrollEnabled}
          >
            <ChevronDown className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
//           PAGINA 2: Pulsantoni grandi
// ──────────────────────────────────────────────
function RemoteOnlyControls({
  lines,
  highlightLine,
  highlightEnabled,
  highlightLinesCount,
  isBroadcasting,
  hasContent,
  remoteScrollEnabled,
  fontSize,
  textAlign,
  onScrollUp,
  onScrollDown,
  onScrollPositionChange,
}: {
  lines: string[];
  highlightLine: number;
  highlightEnabled: boolean;
  highlightLinesCount: number;
  isBroadcasting: boolean;
  hasContent: boolean;
  remoteScrollEnabled: boolean;
  fontSize: number;
  textAlign: 'left' | 'center' | 'right';
  onScrollUp: () => void | Promise<void>;
  onScrollDown: () => void | Promise<void>;
  onScrollPositionChange?: (ratio: number) => void | Promise<unknown>;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const [controlsHeight, setControlsHeight] = useState(0);

  useLayoutEffect(() => {
    const el = controlsRef.current;
    if (!el) return;
    const updateHeight = () => setControlsHeight(el.offsetHeight || 220);
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { onScroll: onRemoteScroll } = useScrollPositionPublisher({
    enabled: remoteScrollEnabled && !highlightEnabled,
    publish: (ratio) => onScrollPositionChange?.(ratio),
  });

  // Auto-scroll only when highlight is enabled
  useLayoutEffect(() => {
    if (!isBroadcasting || lines.length === 0 || !scrollContainerRef.current || !highlightEnabled) return;

    const container = scrollContainerRef.current;
    const activeEl = container.querySelector(`[data-line="${highlightLine}"]`) as HTMLElement | null;

    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightLine, isBroadcasting, lines.length, highlightEnabled]);

  if (!isBroadcasting || !hasContent || lines.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center p-6">
        <div>
          <Mic className="w-20 h-20 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">In attesa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden">
      <div
        ref={scrollContainerRef}
        onScroll={(e) => onRemoteScroll(e.currentTarget)}
        className="absolute inset-0 overflow-y-scroll overscroll-contain px-4 pt-4"
        style={{ paddingBottom: Math.max(controlsHeight + 16, 140) }}
      >
        <div className="text-sm text-muted-foreground mb-4 text-center sticky top-0 bg-background/80 backdrop-blur-sm py-2 -mx-4 px-4 z-10">
          Riga {highlightLine + 1} di {lines.length}
          {!remoteScrollEnabled && <span className="ml-2 text-yellow-600">(Solo lettura)</span>}
        </div>
        <div className={cn(
          "space-y-2 max-w-lg mx-auto pb-6",
          textAlign === 'left' && 'text-left',
          textAlign === 'center' && 'text-center',
          textAlign === 'right' && 'text-right'
        )}>
          {lines.map((line, index) => {
            const isMainHighlight = highlightLine === index;
            const distanceFromMain = index - highlightLine;
            const isInHighlightRange = distanceFromMain >= 0 && distanceFromMain < highlightLinesCount;
            const isPast = index < highlightLine;
            // When highlight is OFF, all lines fully visible
            const opacity = highlightEnabled 
              ? (isMainHighlight ? 1 : isInHighlightRange ? 0.9 : isPast ? 0.5 : 0.3)
              : 1;
            const baseFontSize = Math.max(14, 18 * fontSize / 100);
            // Skip empty lines in display but keep index for sync
            if (!line && !isInHighlightRange && !isMainHighlight) {
              return <div key={index} data-line={index} className="h-2" />;
            }
            return (
              <div
                key={index}
                data-line={index}
                className={cn(
                  "px-4 py-3 rounded-xl leading-relaxed transition-colors duration-200",
                  highlightEnabled && isMainHighlight && "bg-primary text-primary-foreground font-semibold",
                  highlightEnabled && isInHighlightRange && !isMainHighlight && "bg-primary/20 text-primary font-medium",
                  !isInHighlightRange && !isMainHighlight && "text-foreground",
                )}
                style={{ opacity, fontSize: `${baseFontSize}px` }}
              >
                {line || "\u00A0"}
              </div>
            );
          })}
        </div>
      </div>

      <div ref={controlsRef} className="absolute bottom-0 left-0 w-full bg-card/95 backdrop-blur-xl border-t z-50">
        <div className="p-4 pb-[max(16px,env(safe-area-inset-bottom))] max-w-md mx-auto">
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((highlightLine + 1) / lines.length) * 100}%` }}
            />
          </div>
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              variant="outline"
              className={cn(
                "h-20 text-xl font-bold rounded-2xl transition-all active:scale-95",
                (highlightLine === 0 || !remoteScrollEnabled) && "opacity-30",
              )}
              onClick={onScrollUp}
              disabled={highlightLine === 0 || !remoteScrollEnabled}
            >
              <ChevronUp className="w-10 h-10 mr-3" />
              INDIETRO
            </Button>
            <Button
              size="lg"
              className={cn(
                "h-20 text-xl font-bold rounded-2xl transition-all active:scale-95",
                (highlightLine >= lines.length - 1 || !remoteScrollEnabled) && "opacity-30",
              )}
              onClick={onScrollDown}
              disabled={highlightLine >= lines.length - 1 || !remoteScrollEnabled}
            >
              <ChevronDown className="w-10 h-10 mr-3" />
              AVANTI
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
