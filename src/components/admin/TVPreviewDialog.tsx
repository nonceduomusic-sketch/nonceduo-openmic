import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useBroadcast } from '@/hooks/useBroadcast';
import { useSongs } from '@/hooks/useSongs';
import { 
  X, 
  Maximize, 
  Minimize,
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Mic,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import brandLogoText from '@/assets/brand-logo-text.png';

interface TVPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewSongId?: string;
}

export function TVPreviewDialog({ open, onOpenChange, previewSongId }: TVPreviewDialogProps) {
  const { session } = useBroadcast('main');
  const { songs } = useSongs();
  
  const [selectedSongId, setSelectedSongId] = useState<string>(previewSongId || '');
  const [highlightLine, setHighlightLine] = useState(0);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(3);
  const [fontSize, setFontSize] = useState(100); // percentage
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);

  // Get selected song
  const selectedSong = songs.find(s => s.id === selectedSongId);
  const lines = useMemo(() => 
    selectedSong?.testo?.split('\n').filter(line => line.trim()) || []
  , [selectedSong?.testo]);

  // Get TV settings
  const tvSettings = useMemo(() => ({
    title: (session as any)?.tv_title || 'Open Mic',
    subtitle: (session as any)?.tv_subtitle || 'NonceDuo Live Experience',
    footer: (session as any)?.tv_footer || 'Powered by NonceDuo',
    logoUrl: (session as any)?.tv_logo_url || '',
  }), [session]);

  // Auto-scroll effect
  useEffect(() => {
    if (!autoScroll || !lines.length) return;
    
    const interval = setInterval(() => {
      setHighlightLine(prev => {
        if (prev >= lines.length - 1) {
          setAutoScroll(false);
          return 0;
        }
        return prev + 1;
      });
    }, (6 - scrollSpeed) * 1500); // Speed inversely proportional

    return () => clearInterval(interval);
  }, [autoScroll, lines.length, scrollSpeed]);

  // Reset when song changes
  useEffect(() => {
    setHighlightLine(0);
    setAutoScroll(false);
  }, [selectedSongId]);

  // Set initial song
  useEffect(() => {
    if (previewSongId && open) {
      setSelectedSongId(previewSongId);
    }
  }, [previewSongId, open]);

  // Scroll highlighted line into view
  useEffect(() => {
    if (lyricsRef.current && lines.length > 0) {
      const lineElements = lyricsRef.current.querySelectorAll('[data-line]');
      const highlightedLine = lineElements[highlightLine];
      if (highlightedLine) {
        highlightedLine.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [highlightLine, lines.length]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard controls
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setHighlightLine(prev => Math.max(0, prev - 1));
          setAutoScroll(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setHighlightLine(prev => Math.min(lines.length - 1, prev + 1));
          setAutoScroll(false);
          break;
        case ' ':
          e.preventDefault();
          setAutoScroll(prev => !prev);
          break;
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen();
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, lines.length, isFullscreen]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 overflow-hidden bg-black border-0 rounded-none"
        ref={containerRef}
      >
        {/* Control Bar */}
        <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black via-black/90 to-transparent">
          <div className="flex items-center justify-between gap-4 flex-wrap max-w-7xl mx-auto">
            {/* Song Selector */}
            <div className="flex-1 min-w-[200px] max-w-md">
              <Select value={selectedSongId} onValueChange={setSelectedSongId}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Scegli una canzone..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {songs.filter(s => s.testo).slice(0, 100).map(song => (
                    <SelectItem key={song.id} value={song.id}>
                      {song.titolo} - {song.artista}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSong && (
              <>
                {/* Navigation */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => { setHighlightLine(Math.max(0, highlightLine - 1)); setAutoScroll(false); }}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <span className="text-white/60 text-sm w-16 text-center">
                    {highlightLine + 1}/{lines.length}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => { setHighlightLine(Math.min(lines.length - 1, highlightLine + 1)); setAutoScroll(false); }}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>

                {/* Auto-scroll */}
                <div className="flex items-center gap-2">
                  <Button
                    variant={autoScroll ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setAutoScroll(!autoScroll)}
                    className={cn(
                      !autoScroll && "border-white/20 text-white hover:bg-white/10"
                    )}
                  >
                    {autoScroll ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    Auto
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => { setHighlightLine(0); setAutoScroll(false); }}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>

                {/* Speed */}
                <div className="flex items-center gap-2 min-w-[120px]">
                  <Label className="text-white/60 text-xs whitespace-nowrap">Velocità</Label>
                  <Slider
                    value={[scrollSpeed]}
                    onValueChange={([v]) => setScrollSpeed(v)}
                    min={1}
                    max={5}
                    step={1}
                    className="w-20"
                  />
                </div>

                {/* Zoom */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setFontSize(prev => Math.max(50, prev - 10))}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-white/60 text-xs min-w-[40px] text-center">{fontSize}%</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setFontSize(prev => Math.min(200, prev + 10))}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Fullscreen & Close */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleFullscreen}
                className="border-white/20 text-white hover:bg-white/10"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-20">
          {/* Lyrics Preview - Spotify Karaoke Style */}
          <div className="flex-1 overflow-hidden relative">
            {!selectedSong ? (
              <div className="h-full flex flex-col items-center justify-center text-white/50 gap-4">
                <Mic className="w-16 h-16 opacity-30" />
                <p className="text-lg">Seleziona una canzone per vedere l'anteprima</p>
                <p className="text-sm">Usa le frecce ↑↓ per navigare, Spazio per auto-scroll</p>
              </div>
            ) : !selectedSong.testo ? (
              <div className="h-full flex items-center justify-center text-white/50">
                Questa canzone non ha testo
              </div>
            ) : (
              <>
                {/* Ambient background */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[200px]" />
                  <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[150px]" />
                </div>

                {/* Header */}
                <div className="relative z-10 px-8 py-6">
                  <div className="flex items-center gap-6 max-w-5xl mx-auto">
                    <img 
                      src={tvSettings.logoUrl || brandLogoText} 
                      alt="Logo" 
                      className="h-14 md:h-20 w-auto object-contain opacity-80"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = brandLogoText;
                      }}
                    />
                    <div>
                      <h1 
                        className="font-bold text-white tracking-tight"
                        style={{ fontSize: `${Math.max(24, 48 * fontSize / 100)}px` }}
                      >
                        {selectedSong.titolo}
                      </h1>
                      <p 
                        className="text-white/60 mt-1 font-light"
                        style={{ fontSize: `${Math.max(16, 24 * fontSize / 100)}px` }}
                      >
                        {selectedSong.artista}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lyrics */}
                <ScrollArea className="flex-1" style={{ height: 'calc(100vh - 280px)' }}>
                  <div 
                    ref={lyricsRef}
                    className="px-8 md:px-16 lg:px-24 py-8 space-y-6 md:space-y-8 text-center max-w-5xl mx-auto"
                    style={{ paddingTop: '10vh', paddingBottom: '30vh' }}
                  >
                    {lines.map((line, index) => {
                      const isHighlighted = highlightLine === index;
                      const isPast = index < highlightLine;
                      const distanceFromHighlight = Math.abs(index - highlightLine);
                      
                      // Progressive opacity
                      let opacity = 1;
                      if (isPast) opacity = 0.3;
                      else if (distanceFromHighlight === 1) opacity = 0.7;
                      else if (distanceFromHighlight === 2) opacity = 0.5;
                      else if (distanceFromHighlight > 2) opacity = 0.35;
                      
                      // Dynamic font size
                      const baseFontSize = isHighlighted 
                        ? 48 
                        : distanceFromHighlight <= 1 
                          ? 36
                          : 28;
                      
                      return (
                        <p
                          key={index}
                          data-line={index}
                          onClick={() => {
                            setHighlightLine(index);
                            setAutoScroll(false);
                          }}
                          className={cn(
                            "font-bold leading-relaxed transition-all duration-700 ease-out cursor-pointer",
                            "font-sans tracking-wide hover:opacity-100",
                            isHighlighted && "text-primary scale-105"
                          )}
                          style={{
                            fontSize: `${Math.max(14, baseFontSize * fontSize / 100)}px`,
                            opacity,
                            textShadow: isHighlighted 
                              ? '0 0 60px hsl(var(--primary) / 0.6), 0 0 120px hsl(var(--primary) / 0.3)'
                              : 'none',
                            transform: isHighlighted ? 'scale(1.05)' : 'scale(1)',
                          }}
                        >
                          {line || '\u00A0'}
                        </p>
                      );
                    })}
                  </div>
                </ScrollArea>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
                  <p className="text-center text-white/30 text-sm">{tvSettings.footer}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
