import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Guitar, 
  ChevronUp, 
  ChevronDown,
  Minus,
  Plus,
  Play,
  Pause,
  Eye,
  EyeOff,
  Music,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useSongbookFiles, SongbookFile } from '@/hooks/useSongbook';
import { useBroadcast } from '@/hooks/useBroadcast';
import { parseChordPro, transposeSong, renderWithChords, renderLyricsOnly, ChordProSong } from '@/lib/chordpro';
import { clampScrollRatio, getScrollRatioFromElement } from '@/lib/scrollRatio';

export default function SongbookLive() {
  const navigate = useNavigate();
  const { files, loading } = useSongbookFiles();
  const { session, updateSession } = useBroadcast('main');
  
  const [selectedFile, setSelectedFile] = useState<SongbookFile | null>(null);
  const [transpose, setTranspose] = useState(0);
  const [showChordsOnTV, setShowChordsOnTV] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(50);
  const [highlightLines, setHighlightLines] = useState(2);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);
  const lastSyncRef = useRef<number>(0);

  // Parse selected song
  const parsedSong: ChordProSong | null = selectedFile 
    ? transposeSong(parseChordPro(selectedFile.content), transpose)
    : null;

  // Sync scroll to TV
  const syncScrollToTV = useCallback(() => {
    if (!scrollRef.current || !session) return;
    
    const now = Date.now();
    if (now - lastSyncRef.current < 50) return; // Throttle
    lastSyncRef.current = now;
    
    const ratio = getScrollRatioFromElement(scrollRef.current);
    updateSession({ scroll_position: ratio });
  }, [session, updateSession]);

  // Handle scroll event
  const handleScroll = useCallback(() => {
    syncScrollToTV();
  }, [syncScrollToTV]);

  // Auto scroll effect
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      const scroll = () => {
        if (!scrollRef.current) return;
        const speed = scrollSpeed / 1000; // pixels per frame
        scrollRef.current.scrollTop += speed;
        
        // Check if we reached the end
        const maxScroll = scrollRef.current.scrollHeight - scrollRef.current.clientHeight;
        if (scrollRef.current.scrollTop >= maxScroll) {
          setAutoScroll(false);
          return;
        }
        
        autoScrollRef.current = requestAnimationFrame(scroll);
      };
      autoScrollRef.current = requestAnimationFrame(scroll);
    }
    
    return () => {
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
      }
    };
  }, [autoScroll, scrollSpeed]);

  // Broadcast songbook mode when file is selected
  useEffect(() => {
    if (selectedFile && session) {
      updateSession({
        songbook_mode: true,
        songbook_file_id: selectedFile.id,
        songbook_show_chords_on_tv: showChordsOnTV,
        songbook_transpose: transpose,
        display_mode: 'lyrics',
        is_active: true,
      });
    }
  }, [selectedFile?.id, showChordsOnTV]);

  // Stop songbook mode on unmount
  useEffect(() => {
    return () => {
      if (session?.songbook_mode) {
        updateSession({
          songbook_mode: false,
          songbook_file_id: null,
          display_mode: 'waiting',
        });
      }
    };
  }, []);

  const handleSelectFile = (file: SongbookFile) => {
    setSelectedFile(file);
    setTranspose(0);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  };

  const handleTranspose = (delta: number) => {
    setTranspose(prev => {
      const newVal = prev + delta;
      // Keep in range -11 to +11
      if (newVal > 11) return newVal - 12;
      if (newVal < -11) return newVal + 12;
      return newVal;
    });
  };

  const handleBack = () => {
    if (selectedFile) {
      // Stop broadcast and go back to file list
      updateSession({
        songbook_mode: false,
        songbook_file_id: null,
        display_mode: 'waiting',
      });
      setSelectedFile(null);
    } else {
      navigate(-1);
    }
  };

  // File selection view
  if (!selectedFile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Guitar className="w-5 h-5 text-primary" />
                <h1 className="font-bold text-lg">SongBook Live</h1>
              </div>
            </div>
            <Badge variant="outline">{files.length} brani</Badge>
          </div>
        </header>

        {/* File List */}
        <ScrollArea className="flex-1 px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Guitar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nessun file ChordPro caricato</p>
              <p className="text-sm mt-1">Carica file .cho dalla sezione Admin</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <Card 
                  key={file.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => handleSelectFile(file)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Music className="w-5 h-5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{file.title}</p>
                        {file.artist && (
                          <p className="text-sm text-muted-foreground truncate">{file.artist}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  // Song view with controls
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="font-bold text-base truncate">{selectedFile.title}</h1>
              {selectedFile.artist && (
                <p className="text-xs text-muted-foreground truncate">{selectedFile.artist}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {transpose !== 0 && (
              <Badge variant="secondary" className="text-xs">
                {transpose > 0 ? '+' : ''}{transpose}
              </Badge>
            )}
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
        </div>
      </header>

      {/* Song Content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-auto px-4 py-6"
        onScroll={handleScroll}
      >
        {parsedSong && (
          <pre className="font-mono text-sm whitespace-pre-wrap leading-relaxed">
            {renderWithChords(parsedSong)}
          </pre>
        )}
      </div>

      {/* Control Bar */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t px-4 py-3 space-y-3">
        {/* Transpose */}
        <div className="flex items-center justify-between">
          <Label className="text-sm">Tonalità</Label>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9"
              onClick={() => handleTranspose(-1)}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="w-12 text-center font-mono text-sm">
              {transpose > 0 ? '+' : ''}{transpose}
            </span>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9"
              onClick={() => handleTranspose(1)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Show chords on TV toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-sm flex items-center gap-2">
            {showChordsOnTV ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Accordi su TV
          </Label>
          <Switch
            checked={showChordsOnTV}
            onCheckedChange={(checked) => {
              setShowChordsOnTV(checked);
              updateSession({ songbook_show_chords_on_tv: checked });
            }}
          />
        </div>

        {/* Auto scroll */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={autoScroll ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
            >
              {autoScroll ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
              {autoScroll ? 'Stop' : 'Auto'}
            </Button>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Velocità</span>
            <Slider
              value={[scrollSpeed]}
              onValueChange={([v]) => setScrollSpeed(v)}
              min={10}
              max={200}
              step={10}
              className="flex-1"
            />
          </div>
        </div>

        {/* Quick scroll buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => scrollRef.current?.scrollBy({ top: -200, behavior: 'smooth' })}
          >
            <ChevronUp className="w-4 h-4 mr-1" />
            Su
          </Button>
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => scrollRef.current?.scrollBy({ top: 200, behavior: 'smooth' })}
          >
            <ChevronDown className="w-4 h-4 mr-1" />
            Giù
          </Button>
        </div>
      </div>
    </div>
  );
}

