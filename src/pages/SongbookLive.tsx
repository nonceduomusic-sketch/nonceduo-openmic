import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Guitar, 
  ChevronUp, 
  ChevronDown,
  Minus,
  ArrowUpDown,
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
  Palette,
} from 'lucide-react';
import { SongbookLiveDrawer } from '@/components/songbook/SongbookLiveDrawer';
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
import { parseChordPro, transposeSong, renderWithChords, renderLyricsOnly, ChordProSong, ChordProLine } from '@/lib/chordpro';
import { clampScrollRatio, getScrollRatioFromElement } from '@/lib/scrollRatio';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Render song with colored chords using React elements
function renderWithColoredChords(song: ChordProSong): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let lineIndex = 0;
  
  for (const line of song.lines) {
    if (line.type === 'empty') {
      result.push(<div key={`empty-${lineIndex++}`} className="h-4" />);
      continue;
    }
    
    if (line.type === 'comment' || line.type === 'directive') {
      continue;
    }
    
    if (line.type === 'text') {
      result.push(<div key={`text-${lineIndex++}`}>{line.text}</div>);
      continue;
    }
    
    if (line.type === 'chord-text' && line.chords && line.chords.length > 0) {
      // Build chord line with colored spans
      const chordElements: React.ReactNode[] = [];
      let chordLine = '';
      
      for (let i = 0; i < line.chords.length; i++) {
        const { chord, position } = line.chords[i];
        // Add spaces to reach the position
        while (chordLine.length < position) {
          chordLine += ' ';
        }
        chordElements.push(
          <span key={`space-${i}`}>{' '.repeat(Math.max(0, position - (chordElements.length > 0 ? chordLine.length - chord.length : 0)))}</span>
        );
        chordElements.push(
          <span key={`chord-${i}`} className="text-primary font-bold">{chord}</span>
        );
        chordLine += chord;
      }
      
      result.push(
        <div key={`chords-${lineIndex}`} className="text-primary font-bold whitespace-pre">
          {line.chords.map((c, i) => {
            const spaces = i === 0 ? c.position : c.position - (line.chords![i-1].position + line.chords![i-1].chord.length);
            return (
              <React.Fragment key={i}>
                {' '.repeat(Math.max(0, spaces))}
                <span className="text-primary">{c.chord}</span>
              </React.Fragment>
            );
          })}
        </div>
      );
      result.push(<div key={`text-${lineIndex++}`}>{line.text}</div>);
    }
  }
  
  return result;
}

export default function SongbookLive() {
  const navigate = useNavigate();
  const { files, loading } = useSongbookFiles();
  const { session, updateSession } = useBroadcast('main');
  
  const [selectedFile, setSelectedFile] = useState<SongbookFile | null>(null);
  const [transpose, setTranspose] = useState(0);
  const [showChordsOnTV, setShowChordsOnTV] = useState(false);
  const [coloredChords, setColoredChords] = useState(true);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(50);
  const [highlightLines, setHighlightLines] = useState(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'title' | 'artist' | 'recent'>('title');
  
  // Get font size from session (synced with admin panel)
  const fontSize = (session as any)?.font_size ?? 100;
  
  // Check if currently broadcasting ANY songbook content
  const isBroadcasting = (session as any)?.songbook_mode && (session as any)?.is_broadcasting;
  // Check if THIS file is being broadcast
  const isThisFileBroadcasting = isBroadcasting && (session as any)?.songbook_file_id === selectedFile?.id;
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);
  const lastSyncRef = useRef<number>(0);
  const isBroadcastingRef = useRef(isThisFileBroadcasting);
  
  // Keep ref in sync
  useEffect(() => {
    isBroadcastingRef.current = isThisFileBroadcasting;
  }, [isThisFileBroadcasting]);

  // Currently broadcasting file
  const broadcastingFile = useMemo(() => {
    if (!isBroadcasting || !(session as any)?.songbook_file_id) return null;
    return files.find(f => f.id === (session as any).songbook_file_id) ?? null;
  }, [files, isBroadcasting, session]);

  // Filter and sort files
  const filteredFiles = useMemo(() => {
    let result = [...files];
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => 
        f.title.toLowerCase().includes(q) || 
        (f.artist && f.artist.toLowerCase().includes(q))
      );
    }
    
    switch (sortMode) {
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title, 'it'));
        break;
      case 'artist':
        result.sort((a, b) => (a.artist || '').localeCompare(b.artist || '', 'it') || a.title.localeCompare(b.title, 'it'));
        break;
      case 'recent':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }
    
    return result;
  }, [files, searchQuery, sortMode]);

  // Parse selected song
  const parsedSong: ChordProSong | null = selectedFile 
    ? transposeSong(parseChordPro(selectedFile.content), transpose)
    : null;

  // Sync scroll to TV - throttled to avoid flooding DB
  const syncScrollToTV = useCallback(() => {
    if (!scrollRef.current) return;
    
    const now = Date.now();
    if (now - lastSyncRef.current < 50) return;
    lastSyncRef.current = now;
    
    const ratio = getScrollRatioFromElement(scrollRef.current);
    // Use direct supabase call to avoid stale closure issues
    supabase
      .from('broadcast_sessions')
      .update({ scroll_position: ratio })
      .eq('sala_code', 'main')
      .then(({ error }) => {
        if (error) console.error('Scroll sync error:', error);
      });
  }, []);

  // Manual scroll with instant TV sync
  const handleManualScroll = useCallback((direction: 'up' | 'down') => {
    if (!scrollRef.current) return;
    const scrollAmount = 200;
    const newTop = scrollRef.current.scrollTop + (direction === 'up' ? -scrollAmount : scrollAmount);
    scrollRef.current.scrollTop = Math.max(0, newTop);
    
    // Sync after DOM update - use direct call
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        const ratio = getScrollRatioFromElement(scrollRef.current);
        supabase
          .from('broadcast_sessions')
          .update({ scroll_position: ratio })
          .eq('sala_code', 'main')
          .then(({ error }) => {
            if (error) console.error('Manual scroll sync error:', error);
          });
      }
    });
  }, []);

  // Start broadcast to TV
  const handleStartBroadcast = useCallback(() => {
    if (!selectedFile) return;
    // Set ref immediately to avoid race condition with scroll events
    isBroadcastingRef.current = true;
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

  // Stop broadcast - return TV to waiting/landing screen
  const handleStopBroadcast = useCallback(() => {
    isBroadcastingRef.current = false;
    updateSession({
      songbook_mode: false,
      songbook_file_id: null,
      songbook_transpose: 0,
      songbook_show_chords_on_tv: false,
      display_mode: 'waiting',
      is_broadcasting: false,
      is_active: false,
      current_song_id: null,
      scroll_position: 0,
    });
    toast.success('Trasmissione interrotta');
  }, [updateSession]);

  // Handle scroll event from touch/finger scrolling
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    if (!isBroadcastingRef.current) return;
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
        
        // Sync scroll to TV during auto-scroll
        if (isBroadcastingRef.current) {
          syncScrollToTV();
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
  }, [autoScroll, scrollSpeed, syncScrollToTV]);

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
          is_active: false,
          scroll_position: 0,
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
      // Stop songbook broadcast and return to file list — TV goes to waiting
      if (isBroadcasting) {
        updateSession({
          songbook_mode: false,
          songbook_file_id: null,
          display_mode: 'waiting',
          is_broadcasting: false,
          is_active: false,
          scroll_position: 0,
        });
      }
      setSelectedFile(null);
    } else {
      navigate(-1);
    }
  };

  // Broadcast a file directly (from drawer)
  const handleBroadcastFile = useCallback((file: SongbookFile) => {
    setSelectedFile(file);
    setTranspose(0);
    // Auto-start broadcast
    isBroadcastingRef.current = true;
    updateSession({
      songbook_mode: true,
      songbook_file_id: file.id,
      songbook_show_chords_on_tv: showChordsOnTV,
      songbook_transpose: 0,
      display_mode: 'lyrics',
      is_active: true,
      is_broadcasting: true,
      scroll_position: 0,
    });
    toast.success('Trasmissione avviata su TV!');
  }, [showChordsOnTV, updateSession]);

  // File selection view
  if (!selectedFile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SongbookLiveDrawer
                files={files}
                onSelectFile={handleSelectFile}
                onBroadcastFile={handleBroadcastFile}
              />
              <div className="flex items-center gap-2">
                <Guitar className="w-5 h-5 text-primary" />
                <h1 className="font-bold text-lg">SongBook Live</h1>
              </div>
            </div>
            <Badge variant="outline">{filteredFiles.length} brani</Badge>
          </div>
        </header>

        {/* Search Bar + Sort */}
        <div className="px-4 py-3 border-b bg-background/95 backdrop-blur space-y-2">
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
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
            {(['title', 'artist', 'recent'] as const).map((mode) => (
              <Button
                key={mode}
                variant={sortMode === mode ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setSortMode(mode)}
              >
                {mode === 'title' ? 'A-Z Titolo' : mode === 'artist' ? 'A-Z Artista' : 'Recenti'}
              </Button>
            ))}
          </div>
        </div>

        {/* Currently broadcasting banner */}
        {broadcastingFile && (
          <div 
            className="mx-4 mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 cursor-pointer hover:bg-destructive/20 transition-colors"
            onClick={() => handleSelectFile(broadcastingFile)}
          >
            <div className="flex items-center gap-3">
              <Badge className="bg-destructive text-destructive-foreground animate-pulse shrink-0">
                <Tv className="w-3 h-3 mr-1" />
                LIVE
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate text-sm">{broadcastingFile.title}</p>
                {broadcastingFile.artist && (
                  <p className="text-xs text-muted-foreground truncate">{broadcastingFile.artist}</p>
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 -rotate-90" />
            </div>
          </div>
        )}

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
            <SongbookLiveDrawer
              files={files}
              onSelectFile={handleSelectFile}
              onBroadcastFile={handleBroadcastFile}
            />
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
            {isThisFileBroadcasting ? (
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
          {isThisFileBroadcasting ? (
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
          <div 
            className="font-mono whitespace-pre-wrap leading-relaxed text-foreground"
            style={{ fontSize: `${Math.max(12, 14 * fontSize / 100)}px` }}
          >
            {coloredChords ? renderWithColoredChords(parsedSong) : (
              <pre className="whitespace-pre-wrap">{renderWithChords(parsedSong)}</pre>
            )}
          </div>
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

        {/* Colored chords toggle (local display) */}
        <div className="flex items-center justify-between">
          <Label className="text-sm flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Accordi Colorati
          </Label>
          <Switch
            checked={coloredChords}
            onCheckedChange={setColoredChords}
          />
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

