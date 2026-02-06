import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { useBroadcastRemoteUser, useRemoteControl } from "@/hooks/useBroadcastRemote";
import { useBroadcast } from "@/hooks/useBroadcast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronUp, ChevronDown, Eye, Smartphone, WifiOff, AlertTriangle, Lock, Tv, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import brandLogoText from "@/assets/brand-logo-text.png";

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
            <CardTitle className="text-2xl">Telecomando</CardTitle>
            <p className="text-muted-foreground mt-2">{accessInfo?.name || "Accesso"}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePINSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4" /> PIN
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
  const { session } = useBroadcast(salaCode);
  const { updateHighlightLine } = useRemoteControl(sessionId, salaCode);

  const [currentSong, setCurrentSong] = useState<{ titolo: string; artista: string; testo: string | null } | null>(
    null,
  );

  const isBroadcasting = (session as any)?.is_broadcasting ?? false;
  const highlightLine = session?.highlight_line ?? 0;

  const lines = useMemo(
    () => currentSong?.testo?.split("\n").filter((line) => line.trim()) || [],
    [currentSong?.testo],
  );

  useEffect(() => {
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
  }, [session?.current_song_id]);

  const scrollUp = async () => {
    const newLine = Math.max(0, highlightLine - 1);
    await updateHighlightLine(newLine);
  };

  const scrollDown = async () => {
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
              <h1 className="font-semibold truncate text-sm">{currentSong?.titolo || "In attesa..."}</h1>
              {currentSong && <p className="text-xs text-muted-foreground truncate">{currentSong.artista}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === "preview" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("preview")}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "remote" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("remote")}
            >
              <Smartphone className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden">
        {viewMode === "preview" ? (
          // Qui puoi rimettere la tua versione di PreviewWithControls se la preferisci
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Modalità preview (da implementare o tenere come placeholder)
          </div>
        ) : (
          <RemoteOnlyControls
            lines={lines}
            highlightLine={highlightLine}
            isBroadcasting={isBroadcasting}
            onScrollUp={scrollUp}
            onScrollDown={scrollDown}
          />
        )}
      </main>
    </div>
  );
}

interface RemoteOnlyControlsProps {
  lines: string[];
  highlightLine: number;
  isBroadcasting: boolean;
  onScrollUp: () => void;
  onScrollDown: () => void;
}

function RemoteOnlyControls({
  lines,
  highlightLine,
  isBroadcasting,
  onScrollUp,
  onScrollDown,
}: RemoteOnlyControlsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const [controlsHeight, setControlsHeight] = useState(0);

  useLayoutEffect(() => {
    const el = controlsRef.current;
    if (!el) return;
    const updateHeight = () => setControlsHeight(el.offsetHeight || 200);
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!isBroadcasting || lines.length === 0 || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const activeEl = container.querySelector(`[data-line="${highlightLine}"]`) as HTMLElement | null;

    if (!activeEl) {
      console.warn(`Riga ${highlightLine} non trovata`);
      return;
    }

    const containerHeight = container.clientHeight;
    const visibleHeight = containerHeight - controlsHeight;
    let targetScroll = activeEl.offsetTop - visibleHeight / 2 + activeEl.offsetHeight / 2;

    const maxScroll = container.scrollHeight - containerHeight;
    targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));

    container.scrollTo({ top: targetScroll, behavior: "smooth" });
  }, [highlightLine, isBroadcasting, lines.length, controlsHeight]);

  if (!isBroadcasting || lines.length === 0) {
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
        className="absolute inset-0 overflow-y-scroll px-5 pt-6"
        style={{
          paddingBottom: controlsHeight > 0 ? controlsHeight + 80 : 300,
          paddingTop: 100,
        }}
      >
        <div className="sticky top-0 bg-background/90 backdrop-blur-md py-3 text-center text-sm text-muted-foreground z-10 -mx-5 px-5">
          Riga {highlightLine + 1} di {lines.length}
        </div>

        <div className="space-y-4 text-center max-w-lg mx-auto pb-12">
          {lines.map((line, index) => {
            const isHighlighted = index === highlightLine;
            const distance = Math.abs(index - highlightLine);

            return (
              <div
                key={index}
                data-line={index}
                className={cn(
                  "px-5 py-4 rounded-xl text-base leading-relaxed transition-all",
                  isHighlighted
                    ? "bg-primary text-primary-foreground font-semibold shadow-md"
                    : "text-muted-foreground",
                  distance === 1 && "opacity-80",
                  distance === 2 && "opacity-60",
                  distance > 2 && "opacity-40",
                )}
              >
                {line || " "}
              </div>
            );
          })}
        </div>
      </div>

      <div ref={controlsRef} className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t z-50">
        <div className="p-5 pb-[max(56px,env(safe-area-inset-bottom))] max-w-md mx-auto">
          <div className="h-2.5 bg-muted rounded-full mb-6 overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: lines.length > 0 ? `${((highlightLine + 1) / lines.length) * 100}%` : "0%" }}
            />
          </div>

          <div className="flex flex-col gap-4">
            <Button
              size="lg"
              variant="outline"
              className={cn("h-20 text-xl font-bold rounded-2xl", highlightLine === 0 && "opacity-40")}
              onClick={onScrollUp}
              disabled={highlightLine === 0}
            >
              <ChevronUp className="w-10 h-10 mr-3" /> INDIETRO
            </Button>
            <Button
              size="lg"
              className={cn("h-20 text-xl font-bold rounded-2xl", highlightLine >= lines.length - 1 && "opacity-40")}
              onClick={onScrollDown}
              disabled={highlightLine >= lines.length - 1}
            >
              AVANTI <ChevronDown className="w-10 h-10 ml-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
