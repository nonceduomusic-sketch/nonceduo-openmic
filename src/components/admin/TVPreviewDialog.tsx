import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
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

  // Get selected song
  const selectedSong = songs.find(s => s.id === selectedSongId);
  const lines = selectedSong?.testo?.split('\n').filter(line => line.trim()) || [];

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
    }, (6 - scrollSpeed) * 1000); // Speed inversely proportional

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

  // Get TV settings
  const tvSettings = {
    title: (session as any)?.tv_title || 'Open Mic',
    subtitle: (session as any)?.tv_subtitle || 'NonceDuo Live Experience',
    footer: (session as any)?.tv_footer || 'Powered by NonceDuo',
    logoUrl: (session as any)?.tv_logo_url || '',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 overflow-hidden bg-black">
        <DialogHeader className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black via-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">Preview TV - Anteprima Testi</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Preview Content */}
        <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 via-black to-gray-900 pt-16">
          {/* Song Selector */}
          <div className="px-6 py-4 flex flex-wrap items-center gap-4 border-b border-white/10">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-white/60 text-xs mb-1 block">Seleziona canzone</Label>
              <Select value={selectedSongId} onValueChange={setSelectedSongId}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Scegli una canzone..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {songs.filter(s => s.testo).slice(0, 50).map(song => (
                    <SelectItem key={song.id} value={song.id}>
                      {song.titolo} - {song.artista}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSong && (
              <>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setHighlightLine(Math.max(0, highlightLine - 1))}
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
                    onClick={() => setHighlightLine(Math.min(lines.length - 1, highlightLine + 1))}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>

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
                    Auto-scroll
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
              </>
            )}
          </div>

          {/* Lyrics Preview - Karaoke Style */}
          <div className="flex-1 overflow-hidden relative">
            {!selectedSong ? (
              <div className="h-full flex items-center justify-center text-white/50">
                Seleziona una canzone per vedere l'anteprima
              </div>
            ) : !selectedSong.testo ? (
              <div className="h-full flex items-center justify-center text-white/50">
                Questa canzone non ha testo
              </div>
            ) : (
              <>
                {/* Ambient background */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[150px]" />
                  <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/15 rounded-full blur-[150px]" />
                </div>

                {/* Header */}
                <div className="relative z-10 p-6 pb-4">
                  <div className="flex items-center gap-4">
                    <img 
                      src={tvSettings.logoUrl || brandLogoText} 
                      alt="Logo" 
                      className="h-12 w-auto object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = brandLogoText;
                      }}
                    />
                    <div>
                      <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                        {selectedSong.titolo}
                      </h1>
                      <p className="text-xl text-white/70 mt-1">
                        {selectedSong.artista}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lyrics - Professional Karaoke Style */}
                <div className="relative z-10 flex-1 px-6 md:px-16 py-8 overflow-y-auto max-h-[calc(100%-200px)]">
                  <div className="space-y-4 md:space-y-6 text-center max-w-4xl mx-auto">
                    {lines.map((line, index) => {
                      const isHighlighted = highlightLine === index;
                      const isPast = index < highlightLine;
                      const distanceFromHighlight = Math.abs(index - highlightLine);
                      
                      return (
                        <p
                          key={index}
                          className={cn(
                            "text-2xl md:text-3xl lg:text-4xl font-bold leading-relaxed transition-all duration-500",
                            // Font styling
                            "font-sans tracking-wide",
                            isHighlighted && "text-primary scale-105 drop-shadow-[0_0_40px_hsl(var(--primary)/0.6)]",
                            isPast && "text-white/40",
                            !isHighlighted && !isPast && distanceFromHighlight <= 2 && "text-white/80",
                            !isHighlighted && !isPast && distanceFromHighlight > 2 && "text-white/50 text-xl md:text-2xl"
                          )}
                          style={{
                            transform: isHighlighted ? 'scale(1.05)' : 'scale(1)',
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

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
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
