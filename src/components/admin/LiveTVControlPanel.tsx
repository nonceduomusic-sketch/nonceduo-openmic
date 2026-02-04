import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useBroadcast } from '@/hooks/useBroadcast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ChevronUp, 
  ChevronDown, 
  Play, 
  Pause, 
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Square,
  Mic,
  ExternalLink,
  Maximize,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import brandLogoText from '@/assets/brand-logo-text.png';

interface Song {
  id: string;
  titolo: string;
  artista: string;
  testo: string | null;
}

interface LiveTVControlPanelProps {
  canManage?: boolean;
}

export function LiveTVControlPanel({ canManage = true }: LiveTVControlPanelProps) {
  const { session, updateSession, stopBroadcast } = useBroadcast('main');
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [localHighlightLine, setLocalHighlightLine] = useState(0);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(3);
  const [fontSize, setFontSize] = useState(100); // percentage
  const lyricsRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => 
    currentSong?.testo?.split('\n').filter(line => line.trim()) || []
  , [currentSong?.testo]);

  // Fetch current song when it changes
  useEffect(() => {
    const fetchSong = async () => {
      if (!session?.current_song_id) {
        setCurrentSong(null);
        setLocalHighlightLine(0);
        return;
      }

      const { data } = await supabase
        .from('songs')
        .select('id, titolo, artista, testo')
        .eq('id', session.current_song_id)
        .single();

      if (data) {
        setCurrentSong(data);
        setLocalHighlightLine(session.highlight_line || 0);
      }
    };

    fetchSong();
  }, [session?.current_song_id, session?.highlight_line]);

  // Sync highlight line from session (realtime)
  useEffect(() => {
    if (session?.highlight_line !== undefined) {
      setLocalHighlightLine(session.highlight_line);
    }
  }, [session?.highlight_line]);

  // Auto-scroll effect
  useEffect(() => {
    if (!autoScroll || !lines.length) return;
    
    const interval = setInterval(() => {
      setLocalHighlightLine(prev => {
        const next = prev >= lines.length - 1 ? prev : prev + 1;
        // Sync to database
        updateSession({ highlight_line: next } as any);
        return next;
      });
    }, (6 - scrollSpeed) * 1500);

    return () => clearInterval(interval);
  }, [autoScroll, lines.length, scrollSpeed, updateSession]);

  // Scroll highlighted line into view
  useEffect(() => {
    if (lyricsRef.current && lines.length > 0) {
      const lineElements = lyricsRef.current.querySelectorAll('[data-line]');
      const highlightedLine = lineElements[localHighlightLine];
      if (highlightedLine) {
        highlightedLine.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [localHighlightLine, lines.length]);

  const handleLineChange = useCallback(async (direction: 'up' | 'down') => {
    if (!canManage) return;
    
    const newLine = direction === 'up' 
      ? Math.max(0, localHighlightLine - 1)
      : Math.min(lines.length - 1, localHighlightLine + 1);
    
    setLocalHighlightLine(newLine);
    setAutoScroll(false); // Stop auto-scroll on manual navigation
    
    // Sync to database for TV
    await updateSession({ highlight_line: newLine } as any);
  }, [canManage, localHighlightLine, lines.length, updateSession]);

  const handleReset = useCallback(async () => {
    if (!canManage) return;
    setLocalHighlightLine(0);
    setAutoScroll(false);
    await updateSession({ highlight_line: 0 } as any);
  }, [canManage, updateSession]);

  const handleStop = useCallback(async () => {
    if (!canManage) return;
    await stopBroadcast();
    toast.success('Trasmissione interrotta');
  }, [canManage, stopBroadcast]);

  const handleToggleAutoScroll = useCallback(() => {
    setAutoScroll(prev => !prev);
    if (!autoScroll) {
      toast.success('Auto-scroll attivato');
    }
  }, [autoScroll]);

  const openTVPage = () => {
    window.open('/trasmetti', '_blank');
  };

  // No broadcast active
  if (session?.display_mode !== 'lyrics' || !currentSong) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mic className="w-4 h-4" />
            Controllo Trasmissione Live
          </CardTitle>
          <CardDescription>
            Nessuna canzone in trasmissione
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Seleziona una canzone dalla scaletta o dal catalogo per iniziare la trasmissione.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <div>
              <CardTitle className="text-base text-green-600 dark:text-green-400">
                Trasmissione Live
              </CardTitle>
              <CardDescription>
                {currentSong.titolo} - {currentSong.artista}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openTVPage}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Apri TV
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleStop}
              disabled={!canManage}
            >
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls bar */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg">
          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleLineChange('up')}
              disabled={!canManage || localHighlightLine === 0}
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <div className="px-3 min-w-[60px] text-center">
              <span className="text-sm font-medium">
                {localHighlightLine + 1}/{lines.length}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleLineChange('down')}
              disabled={!canManage || localHighlightLine >= lines.length - 1}
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Auto-scroll */}
          <Button
            variant={autoScroll ? "destructive" : "outline"}
            size="sm"
            onClick={handleToggleAutoScroll}
            disabled={!canManage}
          >
            {autoScroll ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            Auto
          </Button>

          {/* Speed */}
          <div className="flex items-center gap-2 min-w-[100px]">
            <Label className="text-xs whitespace-nowrap">Vel.</Label>
            <Slider
              value={[scrollSpeed]}
              onValueChange={([v]) => setScrollSpeed(v)}
              min={1}
              max={5}
              step={1}
              className="w-16"
              disabled={!canManage}
            />
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Zoom */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setFontSize(prev => Math.max(50, prev - 10))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs min-w-[40px] text-center">{fontSize}%</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setFontSize(prev => Math.min(150, prev + 10))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Reset */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleReset}
            disabled={!canManage}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Live Preview - Mini TV View */}
        <div 
          className="relative rounded-xl overflow-hidden bg-gradient-to-b from-gray-900 via-black to-gray-900"
          style={{ minHeight: 300 }}
        >
          {/* Ambient background */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-48 h-48 bg-primary/20 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-purple-500/15 rounded-full blur-[60px]" />
          </div>

          {/* Header */}
          <div className="relative z-10 px-4 pt-4 pb-2">
            <div className="flex items-center gap-3">
              <img 
                src={brandLogoText} 
                alt="Logo" 
                className="h-6 w-auto object-contain opacity-70"
              />
              <div>
                <h3 
                  className="font-bold text-white truncate"
                  style={{ fontSize: `${Math.max(12, 16 * fontSize / 100)}px` }}
                >
                  {currentSong.titolo}
                </h3>
                <p 
                  className="text-white/60 truncate"
                  style={{ fontSize: `${Math.max(10, 12 * fontSize / 100)}px` }}
                >
                  {currentSong.artista}
                </p>
              </div>
            </div>
          </div>

          {/* Lyrics */}
          <ScrollArea className="h-[220px]">
            <div 
              ref={lyricsRef}
              className="px-4 py-4 space-y-3 text-center"
            >
              {lines.map((line, index) => {
                const isHighlighted = localHighlightLine === index;
                const isPast = index < localHighlightLine;
                const distanceFromHighlight = Math.abs(index - localHighlightLine);
                
                return (
                  <p
                    key={index}
                    data-line={index}
                    onClick={() => {
                      if (canManage) {
                        setLocalHighlightLine(index);
                        setAutoScroll(false);
                        updateSession({ highlight_line: index } as any);
                      }
                    }}
                    className={cn(
                      "font-bold leading-relaxed transition-all duration-500 cursor-pointer hover:opacity-100",
                      isHighlighted && "text-primary scale-105",
                      isPast && "text-white/30",
                      !isHighlighted && !isPast && distanceFromHighlight <= 2 && "text-white/70",
                      !isHighlighted && !isPast && distanceFromHighlight > 2 && "text-white/40"
                    )}
                    style={{
                      fontSize: `${Math.max(10, 14 * fontSize / 100)}px`,
                      textShadow: isHighlighted 
                        ? '0 0 30px hsl(var(--primary) / 0.5)'
                        : 'none',
                    }}
                  >
                    {line || '\u00A0'}
                  </p>
                );
              })}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black to-transparent">
            <div className="flex items-center justify-center gap-1.5 text-white/30 text-xs">
              <Mic className="w-3 h-3" />
              <span>Live Preview</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Clicca su una riga per saltarci direttamente. La TV si sincronizza in tempo reale.
        </p>
      </CardContent>
    </Card>
  );
}
