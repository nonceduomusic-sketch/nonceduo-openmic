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
  Monitor,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
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

type ViewMode = 'compact' | 'karaoke' | 'spotify';

// Vibrant color palette for Spotify-style backgrounds
const BACKGROUND_COLORS = [
  'from-purple-600 to-purple-900',
  'from-blue-500 to-blue-800',
  'from-green-500 to-green-800',
  'from-orange-500 to-orange-800',
  'from-pink-500 to-pink-800',
  'from-cyan-500 to-cyan-800',
  'from-rose-500 to-rose-800',
  'from-indigo-500 to-indigo-800',
  'from-teal-500 to-teal-800',
  'from-amber-500 to-amber-800',
  'from-fuchsia-500 to-fuchsia-800',
  'from-emerald-500 to-emerald-800',
];

// Generate a consistent color based on song ID
const getColorForSong = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % BACKGROUND_COLORS.length;
  return BACKGROUND_COLORS[index];
};

export function LiveTVControlPanel({ canManage = true }: LiveTVControlPanelProps) {
  const { session, updateSession, stopBroadcast } = useBroadcast('main');
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [localHighlightLine, setLocalHighlightLine] = useState(0);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(3);
  const [fontSize, setFontSize] = useState(100); // percentage
  const [isFullPreview, setIsFullPreview] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('compact');
  const lyricsRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // TV Settings from session
  const tvSettings = useMemo(() => ({
    title: (session as any)?.tv_title || 'Open Mic',
    subtitle: (session as any)?.tv_subtitle || 'NonceDuo Live Experience',
    footer: (session as any)?.tv_footer || 'Powered by NonceDuo',
    logoUrl: (session as any)?.tv_logo_url || '',
    showLogo: (session as any)?.tv_show_logo ?? true,
  }), [session]);

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

  // Auto-scroll effect - syncs to database so TV follows
  useEffect(() => {
    if (!autoScroll || !lines.length) return;
    
    const interval = setInterval(async () => {
      setLocalHighlightLine(prev => {
        const next = prev >= lines.length - 1 ? prev : prev + 1;
        // Sync to database for TV (async, fire and forget)
        updateSession({ highlight_line: next, auto_scroll: true } as any);
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
    
    // Sync to database for TV - mark as manual control
    await updateSession({ highlight_line: newLine, auto_scroll: false } as any);
  }, [canManage, localHighlightLine, lines.length, updateSession]);

  const handleLineClick = useCallback(async (index: number) => {
    if (!canManage) return;
    setLocalHighlightLine(index);
    setAutoScroll(false);
    // Sync to database - mark as manual control
    await updateSession({ highlight_line: index, auto_scroll: false } as any);
  }, [canManage, updateSession]);

  const handleReset = useCallback(async () => {
    if (!canManage) return;
    setLocalHighlightLine(0);
    setAutoScroll(false);
    await updateSession({ highlight_line: 0, auto_scroll: false } as any);
  }, [canManage, updateSession]);

  const handleStop = useCallback(async () => {
    if (!canManage) return;
    await stopBroadcast();
    toast.success('Trasmissione interrotta');
  }, [canManage, stopBroadcast]);

  const handleToggleAutoScroll = useCallback(async () => {
    const newAutoScroll = !autoScroll;
    setAutoScroll(newAutoScroll);
    // Sync auto_scroll state to database so TV knows
    await updateSession({ auto_scroll: newAutoScroll } as any);
    if (newAutoScroll) {
      toast.success('Auto-scroll attivato');
    }
  }, [autoScroll, updateSession]);

  const openTVPage = (mode?: 'karaoke' | 'spotify') => {
    const url = mode ? `/trasmetti?mode=${mode}` : '/trasmetti';
    window.open(url, '_blank');
  };

  // No broadcast active
  if (session?.display_mode !== 'lyrics' || !currentSong) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="w-4 h-4" />
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

  // Full Preview Mode (expanded) - Mobile optimized
  if (isFullPreview) {
    return (
      <Card className="border-green-500/30">
        <CardContent className="p-0">
          {/* Full TV Replica */}
          <div 
            className="relative rounded-xl overflow-hidden bg-black"
            style={{ minHeight: isMobile ? '60vh' : '70vh' }}
          >
            {/* Ambient background */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-black to-gray-900/50" />
              <div className="absolute top-0 left-1/4 w-[200px] md:w-[400px] h-[200px] md:h-[400px] bg-primary/15 rounded-full blur-[100px] md:blur-[150px]" />
              <div className="absolute bottom-0 right-1/4 w-[150px] md:w-[300px] h-[150px] md:h-[300px] bg-purple-600/10 rounded-full blur-[60px] md:blur-[100px]" />
            </div>

            {/* Header with song info */}
            <div className="relative z-10 px-4 md:px-6 pt-4 md:pt-6 pb-2 md:pb-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                  {tvSettings.showLogo && !isMobile && (
                    <img 
                      src={tvSettings.logoUrl || brandLogoText} 
                      alt="Logo" 
                      className="h-8 md:h-12 w-auto object-contain opacity-80 flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = brandLogoText;
                      }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h1 
                      className="font-bold text-white truncate"
                      style={{ fontSize: isMobile ? `${Math.max(16, 20 * fontSize / 100)}px` : `${Math.max(18, 28 * fontSize / 100)}px` }}
                    >
                      {currentSong.titolo}
                    </h1>
                    <p 
                      className="text-white/60 truncate"
                      style={{ fontSize: isMobile ? `${Math.max(12, 14 * fontSize / 100)}px` : `${Math.max(14, 18 * fontSize / 100)}px` }}
                    >
                      {currentSong.artista}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full animate-pulse mr-1 md:mr-2" />
                    {!isMobile && 'LIVE'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsFullPreview(false)}
                    className="text-white border-white/20 hover:bg-white/10 h-8 w-8 md:h-9 md:w-9"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Lyrics display - Full Spotify style */}
            <div 
              ref={lyricsRef}
              className="relative z-10 px-4 md:px-12 overflow-y-auto"
              style={{ height: isMobile ? 'calc(60vh - 180px)' : 'calc(70vh - 200px)' }}
            >
              <div className={cn(
                "max-w-4xl mx-auto text-center",
                isMobile ? "space-y-3 py-[10vh]" : "space-y-4 md:space-y-6 py-[15vh]"
              )}>
                {lines.map((line, index) => {
                  const isHighlighted = localHighlightLine === index;
                  const isPast = index < localHighlightLine;
                  const distanceFromHighlight = Math.abs(index - localHighlightLine);
                  
                  // Progressive opacity based on distance
                  let opacity = 1;
                  if (isPast) opacity = 0.3;
                  else if (distanceFromHighlight === 1) opacity = 0.7;
                  else if (distanceFromHighlight === 2) opacity = 0.5;
                  else if (distanceFromHighlight > 2) opacity = 0.35;
                  
                  const baseFontSize = isMobile 
                    ? Math.max(14, 18 * fontSize / 100)
                    : Math.max(16, 24 * fontSize / 100);
                  const highlightFontSize = baseFontSize * 1.3;

                  return (
                    <p
                      key={index}
                      data-line={index}
                      onClick={() => handleLineClick(index)}
                      className={cn(
                        "font-bold leading-relaxed transition-all duration-500 cursor-pointer hover:opacity-100",
                        isHighlighted && "text-primary scale-105"
                      )}
                      style={{
                        fontSize: isHighlighted ? `${highlightFontSize}px` : `${baseFontSize}px`,
                        opacity,
                        color: isHighlighted ? 'hsl(var(--primary))' : 'white',
                        textShadow: isHighlighted 
                          ? '0 0 40px hsl(var(--primary) / 0.5), 0 0 80px hsl(var(--primary) / 0.3)'
                          : 'none',
                      }}
                    >
                      {line || '\u00A0'}
                    </p>
                  );
                })}
              </div>
            </div>

            {/* Controls Overlay - Mobile optimized */}
            <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 bg-gradient-to-t from-black via-black/90 to-transparent">
              {isMobile ? (
                // Mobile: 2-row layout
                <div className="space-y-2">
                  {/* Row 1: Navigation + Auto-scroll */}
                  <div className="flex items-center justify-center gap-2">
                    {/* Navigation */}
                    <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleLineChange('up')}
                        disabled={!canManage || localHighlightLine === 0}
                        className="text-white hover:bg-white/20 h-10 w-10"
                      >
                        <ChevronUp className="w-5 h-5" />
                      </Button>
                      <div className="px-2 min-w-[50px] text-center">
                        <span className="text-white font-medium text-sm">
                          {localHighlightLine + 1}/{lines.length}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleLineChange('down')}
                        disabled={!canManage || localHighlightLine >= lines.length - 1}
                        className="text-white hover:bg-white/20 h-10 w-10"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </Button>
                    </div>

                    {/* Auto-scroll */}
                    <Button
                      variant={autoScroll ? "destructive" : "outline"}
                      size="icon"
                      onClick={handleToggleAutoScroll}
                      disabled={!canManage}
                      className={cn("h-10 w-10", !autoScroll && "text-white border-white/20 hover:bg-white/20")}
                    >
                      {autoScroll ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>

                    {/* Reset */}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleReset}
                      disabled={!canManage}
                      className="text-white border-white/20 hover:bg-white/20 h-10 w-10"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Row 2: Speed + Zoom + Stop + TV */}
                  <div className="flex items-center justify-center gap-2">
                    {/* Speed */}
                    <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                      <Label className="text-xs text-white/70">Vel.</Label>
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

                    {/* Zoom */}
                    <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setFontSize(prev => Math.max(50, prev - 10))}
                        className="text-white hover:bg-white/20 h-8 w-8"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </Button>
                      <span className="text-xs text-white min-w-[32px] text-center">{fontSize}%</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setFontSize(prev => Math.min(150, prev + 10))}
                        className="text-white hover:bg-white/20 h-8 w-8"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Stop */}
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={handleStop}
                      disabled={!canManage}
                      className="h-10 w-10"
                    >
                      <Square className="w-4 h-4" />
                    </Button>

                    {/* Open TV */}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openTVPage()}
                      className="text-white border-white/20 hover:bg-white/20 h-10 w-10"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                // Desktop: Single row
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {/* Navigation */}
                  <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleLineChange('up')}
                      disabled={!canManage || localHighlightLine === 0}
                      className="text-white hover:bg-white/20"
                    >
                      <ChevronUp className="w-5 h-5" />
                    </Button>
                    <div className="px-3 min-w-[70px] text-center">
                      <span className="text-white font-medium">
                        {localHighlightLine + 1}/{lines.length}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleLineChange('down')}
                      disabled={!canManage || localHighlightLine >= lines.length - 1}
                      className="text-white hover:bg-white/20"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Auto-scroll */}
                  <Button
                    variant={autoScroll ? "destructive" : "outline"}
                    size="sm"
                    onClick={handleToggleAutoScroll}
                    disabled={!canManage}
                    className={!autoScroll ? "text-white border-white/20 hover:bg-white/20" : ""}
                  >
                    {autoScroll ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    Auto
                  </Button>

                  {/* Speed */}
                  <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
                    <Label className="text-xs text-white/70 whitespace-nowrap">Vel.</Label>
                    <Slider
                      value={[scrollSpeed]}
                      onValueChange={([v]) => setScrollSpeed(v)}
                      min={1}
                      max={5}
                      step={1}
                      className="w-20"
                      disabled={!canManage}
                    />
                  </div>

                  {/* Zoom */}
                  <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFontSize(prev => Math.max(50, prev - 10))}
                      className="text-white hover:bg-white/20"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-white min-w-[40px] text-center">{fontSize}%</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFontSize(prev => Math.min(150, prev + 10))}
                      className="text-white hover:bg-white/20"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Reset */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleReset}
                    disabled={!canManage}
                    className="text-white border-white/20 hover:bg-white/20"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>

                  {/* Stop */}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleStop}
                    disabled={!canManage}
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </Button>

                  {/* Open TV */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openTVPage()}
                    className="text-white border-white/20 hover:bg-white/20"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    TV
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact Mode (default) - Mobile optimized
  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardHeader className="pb-3 px-3 md:px-6">
        <div className={cn(
          "flex gap-3",
          isMobile ? "flex-col" : "items-center justify-between flex-wrap"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm md:text-base text-green-600 dark:text-green-400">
                Trasmissione Live
              </CardTitle>
              <CardDescription className="truncate text-xs md:text-sm">
                {currentSong.titolo} - {currentSong.artista}
              </CardDescription>
            </div>
          </div>
          
          <div className={cn(
            "flex items-center gap-2",
            isMobile && "justify-between"
          )}>
            {/* View Mode Toggle */}
            <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
              <Button
                variant={viewMode === 'compact' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('compact')}
                className="h-7 px-2 text-xs"
              >
                Compatta
              </Button>
              <Button
                variant={viewMode === 'karaoke' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('karaoke')}
                className="h-7 px-2 text-xs"
              >
                Karaoke
              </Button>
              <Button
                variant={viewMode === 'spotify' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('spotify')}
                className="h-7 px-2 text-xs"
              >
                Spotify
              </Button>
            </div>
            
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsFullPreview(true)}
                className="h-8 w-8"
              >
                <Maximize className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => openTVPage()}
                className="h-8 w-8"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={handleStop}
                disabled={!canManage}
                className="h-8 w-8"
              >
                <Square className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 md:space-y-4 px-3 md:px-6">
        {/* Controls bar - Mobile optimized */}
        {isMobile ? (
          <div className="space-y-2">
            {/* Row 1: Navigation + Auto */}
            <div className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleLineChange('up')}
                  disabled={!canManage || localHighlightLine === 0}
                  className="h-9 w-9"
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <div className="px-2 min-w-[50px] text-center">
                  <span className="text-sm font-medium">
                    {localHighlightLine + 1}/{lines.length}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleLineChange('down')}
                  disabled={!canManage || localHighlightLine >= lines.length - 1}
                  className="h-9 w-9"
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>

              <Button
                variant={autoScroll ? "destructive" : "outline"}
                size="sm"
                onClick={handleToggleAutoScroll}
                disabled={!canManage}
                className="h-9"
              >
                {autoScroll ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                Auto
              </Button>
            </div>

            {/* Row 2: Speed + Zoom + Reset */}
            <div className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
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

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setFontSize(prev => Math.max(50, prev - 10))}
                  className="h-8 w-8"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xs min-w-[32px] text-center">{fontSize}%</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setFontSize(prev => Math.min(150, prev + 10))}
                  className="h-8 w-8"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={handleReset}
                disabled={!canManage}
                className="h-8 w-8"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          // Desktop: Single row
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
        )}

        {/* Preview based on view mode */}
        {viewMode === 'spotify' ? (
          /* SPOTIFY-style Preview - Colorful background like Lyrics.tsx */
          <div 
            className={cn(
              "relative rounded-xl overflow-hidden cursor-pointer bg-gradient-to-b",
              currentSong ? getColorForSong(currentSong.id) : 'from-purple-600 to-purple-900'
            )}
            style={{ minHeight: isMobile ? 260 : 320 }}
            onClick={() => setIsFullPreview(true)}
          >
            {/* Header with song info */}
            <div className="relative z-10 px-4 pt-4 pb-2">
              <div className="flex items-center gap-3">
                {tvSettings.showLogo && !isMobile && (
                  <img 
                    src={tvSettings.logoUrl || brandLogoText} 
                    alt="Logo" 
                    className="h-6 w-auto object-contain opacity-80"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = brandLogoText;
                    }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h3 
                    className="font-bold text-white truncate"
                    style={{ fontSize: `${Math.max(14, (isMobile ? 16 : 20) * fontSize / 100)}px` }}
                  >
                    {currentSong.titolo}
                  </h3>
                  <p 
                    className="text-white/70 truncate"
                    style={{ fontSize: `${Math.max(11, (isMobile ? 12 : 14) * fontSize / 100)}px` }}
                  >
                    {currentSong.artista}
                  </p>
                </div>
              </div>
            </div>

            {/* Spotify-style Lyrics - Like Lyrics.tsx */}
            <div 
              ref={lyricsRef}
              className="relative z-10 px-4 py-4 overflow-y-auto"
              style={{ maxHeight: isMobile ? 180 : 240 }}
            >
              <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4">
                {lines.map((line, index) => {
                  const isHighlighted = localHighlightLine === index;
                  const isPast = index < localHighlightLine;
                  
                  return (
                    <p
                      key={index}
                      data-line={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLineClick(index);
                      }}
                      className={cn(
                        "font-sans leading-relaxed transition-all duration-300 cursor-pointer py-1",
                        isHighlighted && "bg-yellow-400/30 ring-2 ring-yellow-400/50 rounded-lg px-2 scale-[1.01]",
                        isPast && "opacity-40",
                        !isHighlighted && !isPast && "text-white hover:bg-white/10 rounded px-2"
                      )}
                      style={{ 
                        fontSize: `${Math.max(isMobile ? 13 : 14, (isMobile ? 14 : 16) * fontSize / 100)}px`,
                        color: isHighlighted ? 'white' : undefined
                      }}
                    >
                      {line || '\u00A0'}
                    </p>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent">
              <div className="flex items-center justify-center gap-1.5 text-white/50 text-xs">
                <span>Tocca per espandere • Stile Spotify</span>
              </div>
            </div>
          </div>
        ) : viewMode === 'karaoke' ? (
          /* KARAOKE-style Preview - Dark with ambient glow */
          <div 
            className="relative rounded-xl overflow-hidden bg-gradient-to-b from-gray-900 via-black to-gray-900 cursor-pointer"
            style={{ minHeight: isMobile ? 260 : 320 }}
            onClick={() => setIsFullPreview(true)}
          >
            {/* Ambient background */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/4 w-32 md:w-48 h-32 md:h-48 bg-primary/20 rounded-full blur-[60px] md:blur-[80px]" />
              <div className="absolute bottom-0 right-1/4 w-28 md:w-40 h-28 md:h-40 bg-purple-500/15 rounded-full blur-[40px] md:blur-[60px]" />
            </div>

            {/* Header */}
            <div className="relative z-10 px-3 md:px-4 pt-3 md:pt-4 pb-2">
              <div className="flex items-center gap-2 md:gap-3">
                {tvSettings.showLogo && !isMobile && (
                  <img 
                    src={tvSettings.logoUrl || brandLogoText} 
                    alt="Logo" 
                    className="h-5 md:h-6 w-auto object-contain opacity-70"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = brandLogoText;
                    }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h3 
                    className="font-bold text-white truncate"
                    style={{ fontSize: `${Math.max(12, (isMobile ? 14 : 18) * fontSize / 100)}px` }}
                  >
                    {currentSong.titolo}
                  </h3>
                  <p 
                    className="text-white/60 truncate"
                    style={{ fontSize: `${Math.max(10, (isMobile ? 12 : 14) * fontSize / 100)}px` }}
                  >
                    {currentSong.artista}
                  </p>
                </div>
              </div>
            </div>

            {/* Karaoke-style Lyrics with glow */}
            <div 
              ref={lyricsRef}
              className={cn(
                "px-4 md:px-6 py-4 md:py-6 text-center overflow-y-auto",
                isMobile ? "space-y-3" : "space-y-4"
              )}
              style={{ maxHeight: isMobile ? 160 : 220 }}
            >
              {lines.map((line, index) => {
                const isHighlighted = localHighlightLine === index;
                const isPast = index < localHighlightLine;
                const distanceFromHighlight = Math.abs(index - localHighlightLine);
                
                let opacity = 1;
                if (isPast) opacity = 0.3;
                else if (distanceFromHighlight === 1) opacity = 0.7;
                else if (distanceFromHighlight === 2) opacity = 0.5;
                else if (distanceFromHighlight > 2) opacity = 0.35;

                const baseFontSize = Math.max(isMobile ? 12 : 14, (isMobile ? 14 : 18) * fontSize / 100);
                const highlightFontSize = baseFontSize * 1.25;

                return (
                  <p
                    key={index}
                    data-line={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLineClick(index);
                    }}
                    className={cn(
                      "font-bold leading-relaxed transition-all duration-500 cursor-pointer hover:opacity-100",
                      isHighlighted && "scale-105"
                    )}
                    style={{
                      fontSize: isHighlighted ? `${highlightFontSize}px` : `${baseFontSize}px`,
                      opacity,
                      color: isHighlighted ? 'hsl(var(--primary))' : 'white',
                      textShadow: isHighlighted 
                        ? '0 0 40px hsl(var(--primary) / 0.5), 0 0 80px hsl(var(--primary) / 0.3)'
                        : 'none',
                    }}
                  >
                    {line || '\u00A0'}
                  </p>
                );
              })}
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black to-transparent">
              <div className="flex items-center justify-center gap-1.5 text-white/30 text-xs">
                <Mic className="w-3 h-3" />
                <span>Tocca per espandere • Karaoke</span>
              </div>
            </div>
          </div>
        ) : (
          /* COMPACT Preview - Simple text list */
          <div 
            className="relative rounded-lg overflow-hidden border bg-card cursor-pointer"
            onClick={() => setIsFullPreview(true)}
          >
            {/* Header */}
            <div className="p-2 md:p-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                {tvSettings.showLogo && !isMobile && (
                  <img 
                    src={tvSettings.logoUrl || brandLogoText} 
                    alt="Logo" 
                    className="h-4 md:h-5 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = brandLogoText;
                    }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs md:text-sm truncate">{currentSong.titolo}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground truncate">{currentSong.artista}</p>
                </div>
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px] md:text-xs px-1.5">
                  LIVE
                </Badge>
              </div>
            </div>

            {/* Compact Lyrics List */}
            <div 
              ref={lyricsRef}
              className="p-2 md:p-3 space-y-1 md:space-y-1.5 overflow-y-auto"
              style={{ maxHeight: isMobile ? 160 : 200 }}
            >
              {lines.map((line, index) => {
                const isHighlighted = localHighlightLine === index;
                const isPast = index < localHighlightLine;
                
                return (
                  <p
                    key={index}
                    data-line={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLineClick(index);
                    }}
                    className={cn(
                      "leading-relaxed transition-all duration-300 cursor-pointer px-2 py-1 rounded",
                      isHighlighted && "bg-primary/20 text-primary font-semibold",
                      isPast && "text-muted-foreground",
                      !isHighlighted && !isPast && "text-foreground hover:bg-muted"
                    )}
                    style={{ fontSize: `${Math.max(isMobile ? 11 : 12, (isMobile ? 12 : 14) * fontSize / 100)}px` }}
                  >
                    <span className="mr-2 text-[10px] md:text-xs text-muted-foreground">{index + 1}</span>
                    {line || '\u00A0'}
                  </p>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-2 border-t bg-muted/20 text-center">
              <span className="text-[10px] md:text-xs text-muted-foreground">Tocca per espandere</span>
            </div>
          </div>
        )}

        <p className="text-[10px] md:text-xs text-muted-foreground text-center">
          Tocca una riga per saltarci. La TV si sincronizza in tempo reale.
        </p>
      </CardContent>
    </Card>
  );
}
