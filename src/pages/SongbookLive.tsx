import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Search,
  Square,
  Tv,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useSongbookFiles, SongbookFile } from '@/hooks/useSongbook';
import { useBroadcast } from '@/hooks/useBroadcast';
import { parseChordPro, transposeSong, renderWithChords, renderLyricsOnly, ChordProSong } from '@/lib/chordpro';
import { clampScrollRatio, getScrollRatioFromElement } from '@/lib/scrollRatio';
import { toast } from 'sonner';

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
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get font size from session (synced with admin panel)
  const fontSize = (session as any)?.font_size ?? 100;
  
  // Check if currently broadcasting this songbook
  const isBroadcasting = session?.songbook_mode && session?.songbook_file_id === selectedFile?.id && session?.is_broadcasting;
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);
  const lastSyncRef = useRef<number>(0);

  // Filter files by search query
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const q = searchQuery.toLowerCase();
    return files.filter(f => 
      f.title.toLowerCase().includes(q) || 
      (f.artist && f.artist.toLowerCase().includes(q))
    );
  }, [files, searchQuery]);

  // Parse selected song
  const parsedSong: ChordProSong | null = selectedFile 
    ? transposeSong(parseChordPro(selectedFile.content), transpose)
    : null;

  // Sync scroll to TV - instant update
  const syncScrollToTV = useCallback(() => {
    if (!scrollRef.current || !session) return;
    
    const now = Date.now();
    if (now - lastSyncRef.current < 30) return; // Fast throttle
    lastSyncRef.current = now;
    
    const ratio = getScrollRatioFromElement(scrollRef.current);
    updateSession({ scroll_position: ratio });
  }, [session, updateSession]);

  // Manual scroll with instant TV sync
  const handleManualScroll = useCallback((direction: 'up' | 'down') => {
    if (!scrollRef.current) return;
    const scrollAmount = 200;
    const newTop = scrollRef.current.scrollTop + (direction === 'up' ? -scrollAmount : scrollAmount);
    scrollRef.current.scrollTop = Math.max(0, newTop);
    
    // Immediately sync to TV
    setTimeout(() => {
      if (scrollRef.current) {
        const ratio = getScrollRatioFromElement(scrollRef.current);
        updateSession({ scroll_position: ratio });
      }
    }, 10);
  }, [updateSession]);

  // Start broadcast to TV
  const handleStartBroadcast = useCallback(() => {
    if (!selectedFile) return;
    updateSession({
      songbook_mode: true,
      songbook_file_id: selectedFile.id,
      songbook_show_chords_on_tv: showChordsOnTV,
      songbook_transpose: transpose,
      display_mode: 'lyrics',
      is_active: true,
      is_broadcasting: true,
      scroll_position: 0,
    });
    toast.success('Trasmissione avviata su TV!');
  }, [selectedFile, showChordsOnTV, transpose, updateSession]);

  // Stop broadcast
  const handleStopBroadcast = useCallback(() => {
    updateSession({
      songbook_mode: false,
      songbook_file_id: null,
      display_mode: 'waiting',
      is_broadcasting: false,
    });
    toast.success('Trasmissione interrotta');
  }, [updateSession]);

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

  // DON'T auto-broadcast on file select - user controls with Avvia button
  // Just prepare the session without broadcasting
  useEffect(() => {
    if (selectedFile && session && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [selectedFile?.id]);

  // Sync transpose to TV in real-time
  useEffect(() => {
    if (selectedFile && session) {
      updateSession({ songbook_transpose: transpose } as any);
    }
  }, [transpose]);

  // Sync chords toggle to TV in real-time
  useEffect(() => {
    if (selectedFile && session) {
      updateSession({ songbook_show_chords_on_tv: showChordsOnTV } as any);
    }
  }, [showChordsOnTV]);

  // Stop songbook mode on unmount
  useEffect(() => {
    return () => {
      if (session?.songbook_mode) {
        updateSession({
          songbook_mode: false,
          songbook_file_id: null,
          display_mode: 'waiting',
          is_broadcasting: false,
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

  // Quick transpose to specific key (for common transpositions)
  const handleQuickTranspose = (semitones: number) => {
    setTranspose(semitones);
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
            <Badge variant="outline">{filteredFiles.length} brani</Badge>
          </div>
        </header>

        {/* Search Bar */}
        <div className="px-4 py-3 border-b bg-background/95 backdrop-blur">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca titolo o artista..."
              className="pl-10 h-12 bg-muted border-border focus:border-primary"
            />
          </div>
        </div>

        {/* File List */}
        <ScrollArea className="flex-1 px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Guitar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              {searchQuery ? (
                <p>Nessun risultato per "{searchQuery}"</p>
              ) : (
                <>
                  <p>Nessun file ChordPro caricato</p>
                  <p className="text-sm mt-1">Carica file .cho dalla sezione Admin</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFiles.map((file) => (
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
            {/* Broadcast indicator */}
            {isBroadcasting ? (
              <Badge className="bg-destructive text-destructive-foreground animate-pulse">
                <Tv className="w-3 h-3 mr-1" />
                LIVE
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                <Tv className="w-3 h-3 mr-1" />
                OFF
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Broadcast Control Bar */}
      <div className="bg-muted/50 border-b px-4 py-2">
        <div className="flex items-center gap-2">
          {isBroadcasting ? (
            <Button 
              variant="destructive" 
              size="sm"
              className="flex-1"
              onClick={handleStopBroadcast}
            >
              <Square className="w-4 h-4 mr-2" />
              Arresta Trasmissione
            </Button>
          ) : (
            <Button 
              size="sm"
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={handleStartBroadcast}
            >
              <Play className="w-4 h-4 mr-2" />
              Avvia Trasmissione TV
            </Button>
          )}
        </div>
      </div>

      {/* Song Content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-auto px-4 py-6"
        onScroll={handleScroll}
      >
        {parsedSong && (
          <pre 
            className="font-mono whitespace-pre-wrap leading-relaxed text-foreground"
            style={{ fontSize: `${Math.max(12, 14 * fontSize / 100)}px` }}
          >
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

        {/* Quick scroll buttons - with instant TV sync */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 h-12"
            onClick={() => handleManualScroll('up')}
          >
            <ChevronUp className="w-5 h-5 mr-1" />
            Su
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 h-12"
            onClick={() => handleManualScroll('down')}
          >
            <ChevronDown className="w-5 h-5 mr-1" />
            Giù
          </Button>
        </div>
      </div>
    </div>
  );
}

