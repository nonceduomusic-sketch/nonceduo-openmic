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
  Palette,
  SkipBack,
  SkipForward,
  WifiOff,
  Server,
  Footprints,
  MoveHorizontal,
  Settings2,
  ArrowUpDown,
  Highlighter,
  Radio,
  ListPlus,
} from 'lucide-react';
import { SongbookLiveDrawer } from '@/components/songbook/SongbookLiveDrawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { SongbookFile, SongbookSetlistSong, useSongbookSetlists, useSongbookSetlistSongs } from '@/hooks/useSongbook';
import { useCachedSongbookFiles } from '@/hooks/useCachedSongbook';
import { useBroadcast } from '@/hooks/useBroadcast';
import { useConnectionMode, useLocalBroadcast } from '@/hooks/useLocalBroadcast';
import { parseChordPro, transposeSong, ChordProSong, ChordProLine } from '@/lib/chordpro';
import { clampScrollRatio, getScrollRatioFromElement } from '@/lib/scrollRatio';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePedalScroll, usePedalControl } from '@/hooks/usePedalControl';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';

import { renderResponsiveSong, renderLyricsOnlyNodes } from '@/lib/chordproRenderer';

export default function SongbookLive() {
  const navigate = useNavigate();
  const { files, loading, isFromCache, cacheStats, preCacheFileIds } = useCachedSongbookFiles();
  const { session, updateSession } = useBroadcast('main');
  const { setlists } = useSongbookSetlists();
  const { mode, setMode, localIP, setLocalIP, serverUrl } = useConnectionMode();
  
  const isLocalMode = mode === 'local';
  
  // Local broadcast connection
  const { connected: localConnected, latency: localLatency, sendUpdate: localSendUpdate, cacheSong: localCacheSong } = useLocalBroadcast({
    enabled: isLocalMode,
    serverUrl,
    onStateUpdate: (state) => {},
  });

  // Unified update: sends to cloud OR local depending on mode
  const syncUpdate = useCallback((updates: Record<string, unknown>) => {
    if (isLocalMode) {
      localSendUpdate(updates);
    } else {
      updateSession(updates as any);
    }
  }, [isLocalMode, localSendUpdate, updateSession]);
  
  const [selectedFile, setSelectedFile] = useState<SongbookFile | null>(null);
  const [transpose, setTranspose] = useState(0);
  const [showChordsOnTV, setShowChordsOnTV] = useState(false);
  const [coloredChords, setColoredChords] = useState(true);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(50);
  const [highlightLines, setHighlightLines] = useState(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'title' | 'artist' | 'recent'>('title');
  const [swipeEnabled, setSwipeEnabled] = useState(() => safeGetItem('local', 'songbook_swipe_enabled') === 'true');
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Local text scale (50-200%, persisted)
  const [localTextScale, setLocalTextScale] = useState<number>(() => {
    const saved = safeGetItem('local', 'songbook_text_scale');
    const val = saved ? parseInt(saved, 10) : 100;
    return val >= 50 && val <= 200 ? val : 100;
  });
  
  const handleTextScaleChange = useCallback((val: number) => {
    setLocalTextScale(val);
    safeSetItem('local', 'songbook_text_scale', String(val));
  }, []);
  
  // Active setlist tracking for prev/next navigation
  const [activeSetlistSongs, setActiveSetlistSongs] = useState<SongbookSetlistSong[] | null>(null);
  
  // Get font size from session (synced with admin panel) combined with local scale
  const fontSize = ((session as any)?.font_size ?? 100) * localTextScale / 100;
  
  // Check if currently broadcasting ANY songbook content
  const isBroadcasting = (session as any)?.songbook_mode && (session as any)?.is_broadcasting;
  // Check if THIS file is being broadcast
  const isThisFileBroadcasting = isBroadcasting && (session as any)?.songbook_file_id === selectedFile?.id;
  
  // Current song index in active setlist
  const currentSetlistIndex = useMemo(() => {
    if (!activeSetlistSongs || !selectedFile) return -1;
    return activeSetlistSongs.findIndex(s => s.songbook_file_id === selectedFile.id);
  }, [activeSetlistSongs, selectedFile]);

  const canGoPrev = activeSetlistSongs && currentSetlistIndex > 0;
  const canGoNext = activeSetlistSongs && currentSetlistIndex >= 0 && currentSetlistIndex < activeSetlistSongs.length - 1;
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);
  const lastSyncRef = useRef<number>(0);
  const isBroadcastingRef = useRef(isThisFileBroadcasting);
  
  // Swipe tracking refs
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const swipeLockedRef = useRef<'horizontal' | 'vertical' | null>(null);
  
  // Keep ref in sync
  useEffect(() => {
    isBroadcastingRef.current = isThisFileBroadcasting;
  }, [isThisFileBroadcasting]);

  // Pedal control: scroll mode (local scroll only)
  const { isActive: pedalScrollActive } = usePedalScroll({
    page: 'songbook',
    scrollRef: scrollRef as React.RefObject<HTMLElement>,
    onAfterScroll: () => {
      if (isBroadcastingRef.current) {
        syncScrollToTV();
      }
    },
  });

  // Pedal control: highlight mode (controls TV highlight_line)
  const highlightLineFromSession = (session as any)?.highlight_line ?? 0;
  const songTextLines = useMemo(() => {
    if (!selectedFile) return 0;
    const parsed = parseChordPro(selectedFile.content);
    return parsed.lines.filter(l => l.type === 'text' || l.type === 'chord-text').length;
  }, [selectedFile]);

  const { isActive: pedalHighlightActive } = usePedalControl({
    page: 'songbook',
    highlightLine: highlightLineFromSession,
    totalLines: songTextLines || 1,
    onLineChange: (newLine) => {
      syncUpdate({ highlight_line: newLine, auto_scroll: false });
    },
  });

  const pedalActive = pedalScrollActive || pedalHighlightActive;

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
      case 'title': result.sort((a, b) => a.title.localeCompare(b.title, 'it')); break;
      case 'artist': result.sort((a, b) => (a.artist || '').localeCompare(b.artist || '', 'it') || a.title.localeCompare(b.title, 'it')); break;
      case 'recent': result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
    }
    return result;
  }, [files, searchQuery, sortMode]);

  // Parse selected song
  const parsedSong: ChordProSong | null = selectedFile 
    ? transposeSong(parseChordPro(selectedFile.content), transpose)
    : null;

  // Sync scroll to TV - throttled, includes highlight_line for cross-view text alignment
  const syncScrollToTV = useCallback(() => {
    if (!scrollRef.current) return;
    const now = Date.now();
    if (now - lastSyncRef.current < 50) return;
    lastSyncRef.current = now;
    
    const container = scrollRef.current;
    const ratio = getScrollRatioFromElement(container);
    
    // Find centered text line for cross-view sync
    const centerY = container.scrollTop + container.clientHeight / 2;
    const lineElements = container.querySelectorAll('[data-line]');
    let closestLine = 0;
    let closestDist = Infinity;
    
    lineElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const lineCenter = htmlEl.offsetTop + htmlEl.offsetHeight / 2;
      const dist = Math.abs(lineCenter - centerY);
      if (dist < closestDist) {
        closestDist = dist;
        closestLine = parseInt(htmlEl.dataset.line || '0', 10);
      }
    });
    
    syncUpdate({ scroll_position: ratio, highlight_line: closestLine });
  }, [syncUpdate]);

  // Manual scroll with instant TV sync
  const handleManualScroll = useCallback((direction: 'up' | 'down') => {
    if (!scrollRef.current) return;
    const scrollAmount = 200;
    const newTop = scrollRef.current.scrollTop + (direction === 'up' ? -scrollAmount : scrollAmount);
    scrollRef.current.scrollTop = Math.max(0, newTop);
    requestAnimationFrame(() => { syncScrollToTV(); });
  }, [syncScrollToTV]);

  // Broadcast a specific file (shared logic)
  const broadcastFile = useCallback((file: SongbookFile) => {
    const savedTranspose = (file as any).last_transpose ?? 0;
    setSelectedFile(file);
    setTranspose(savedTranspose);
    isBroadcastingRef.current = true;
    const updates = {
      songbook_mode: true,
      songbook_file_id: file.id,
      songbook_show_chords_on_tv: showChordsOnTV,
      songbook_transpose: savedTranspose,
      display_mode: 'lyrics',
      is_active: true,
      is_broadcasting: true,
      scroll_position: 0,
    };
    syncUpdate(updates);
    if (isLocalMode) {
      localCacheSong({ id: file.id, title: file.title, artist: file.artist, content: file.content });
    }
  }, [showChordsOnTV, syncUpdate, isLocalMode, localCacheSong]);

  // Start broadcast
  const handleStartBroadcast = useCallback(() => {
    if (!selectedFile) return;
    const broadcastToTV = (session as any)?.broadcast_to_tv ?? true;
    const broadcastToPartiture = (session as any)?.broadcast_to_partiture ?? true;
    isBroadcastingRef.current = true;
    syncUpdate({
      songbook_mode: true,
      songbook_file_id: selectedFile.id,
      songbook_show_chords_on_tv: showChordsOnTV,
      songbook_transpose: transpose,
      display_mode: broadcastToTV ? 'lyrics' : 'waiting',
      is_active: true,
      is_broadcasting: broadcastToTV,
      broadcast_to_tv: broadcastToTV,
      broadcast_to_partiture: broadcastToPartiture,
      scroll_position: 0,
    });
    if (isLocalMode) {
      localCacheSong({ id: selectedFile.id, title: selectedFile.title, artist: selectedFile.artist, content: selectedFile.content });
    }
    const targets = [broadcastToTV && 'TV', broadcastToPartiture && 'Partiture'].filter(Boolean).join(' + ');
    toast.success(`Trasmissione avviata: ${targets}`);
  }, [selectedFile, showChordsOnTV, transpose, syncUpdate, isLocalMode, localCacheSong, session]);

  // Stop broadcast
  const handleStopBroadcast = useCallback(() => {
    isBroadcastingRef.current = false;
    syncUpdate({
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
  }, [syncUpdate]);

  // Handle scroll event - sync whenever songbook_mode is active (not just full broadcast)
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    if (!(session as any)?.songbook_mode) return;
    syncScrollToTV();
  }, [syncScrollToTV, session]);

  // Auto scroll effect
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      const scroll = () => {
        if (!scrollRef.current) return;
        const speed = scrollSpeed / 1000;
        scrollRef.current.scrollTop += speed;
        const maxScroll = scrollRef.current.scrollHeight - scrollRef.current.clientHeight;
        if (scrollRef.current.scrollTop >= maxScroll) { setAutoScroll(false); return; }
        if ((session as any)?.songbook_mode) { syncScrollToTV(); }
        autoScrollRef.current = requestAnimationFrame(scroll);
      };
      autoScrollRef.current = requestAnimationFrame(scroll);
    }
    return () => { if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current); };
  }, [autoScroll, scrollSpeed, syncScrollToTV]);

  // Reset scroll on file change
  useEffect(() => {
    if (selectedFile && session && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [selectedFile?.id]);

  // Sync transpose to TV and persist
  useEffect(() => {
    if (selectedFile && session) {
      syncUpdate({ songbook_transpose: transpose });
      supabase
        .from('songbook_files')
        .update({ last_transpose: transpose } as any)
        .eq('id', selectedFile.id)
        .then(({ error }) => { if (error) console.error('Error saving transpose:', error); });
    }
  }, [transpose]);

  // Sync chords toggle to TV
  useEffect(() => {
    if (selectedFile && session) {
      syncUpdate({ songbook_show_chords_on_tv: showChordsOnTV });
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

  // Auto-sync file to partiture when browsing (if broadcast_to_partiture is enabled)
  const autoSyncToPartiture = useCallback((file: SongbookFile) => {
    const broadcastToPartiture = (session as any)?.broadcast_to_partiture ?? true;
    if (broadcastToPartiture) {
      syncUpdate({
        songbook_mode: true,
        songbook_file_id: file.id,
        songbook_transpose: (file as any).last_transpose ?? 0,
        songbook_show_chords_on_tv: showChordsOnTV,
        broadcast_to_partiture: true,
        scroll_position: 0,
        highlight_line: 0,
      });
      if (isLocalMode) {
        localCacheSong({ id: file.id, title: file.title, artist: file.artist, content: file.content });
      }
    }
  }, [session, syncUpdate, showChordsOnTV, isLocalMode, localCacheSong]);

  const handleSelectFile = (file: SongbookFile) => {
    setSelectedFile(file);
    setTranspose((file as any).last_transpose ?? 0);
    preCacheFileIds([file.id]);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    // Auto-send to partiture when browsing
    autoSyncToPartiture(file);
  };

  // Quick add song to a setlist
  const handleAddToSetlist = useCallback(async (file: SongbookFile, setlistId: string) => {
    const { data: existingSongs } = await supabase
      .from('songbook_setlist_songs')
      .select('position')
      .eq('setlist_id', setlistId)
      .order('position', { ascending: false })
      .limit(1);
    
    const nextPos = existingSongs && existingSongs.length > 0 ? existingSongs[0].position + 1 : 0;
    const { error } = await supabase
      .from('songbook_setlist_songs')
      .insert({ setlist_id: setlistId, songbook_file_id: file.id, position: nextPos });
    
    if (error) {
      toast.error('Errore aggiunta brano');
    } else {
      toast.success(`"${file.title}" aggiunto alla scaletta`);
    }
  }, []);

  const handleBroadcastFile = useCallback((file: SongbookFile) => {
    setActiveSetlistSongs(null);
    broadcastFile(file);
    toast.success('Trasmissione avviata su TV!');
  }, [broadcastFile]);

  const handleSetlistBroadcast = useCallback((file: SongbookFile, setlistSongs: SongbookSetlistSong[]) => {
    setActiveSetlistSongs(setlistSongs);
    broadcastFile(file);
    const fileIds = setlistSongs.map(s => s.songbook_file_id);
    preCacheFileIds(fileIds).then(() => {
      console.log('[SongbookCache] Pre-cached setlist songs:', fileIds.length);
    });
    toast.success('Trasmissione avviata su TV!');
  }, [broadcastFile, preCacheFileIds]);

  // Navigate to prev/next in setlist (auto-syncs to partiture even without full broadcast)
  const handleSetlistNav = useCallback((direction: 'prev' | 'next') => {
    if (!activeSetlistSongs || currentSetlistIndex < 0) return;
    const newIndex = direction === 'prev' ? currentSetlistIndex - 1 : currentSetlistIndex + 1;
    if (newIndex < 0 || newIndex >= activeSetlistSongs.length) return;
    const nextSong = activeSetlistSongs[newIndex];
    const file = files.find(f => f.id === nextSong.songbook_file_id);
    if (!file) return;
    
    // If full broadcasting, use broadcastFile. Otherwise auto-sync to partiture
    if (isBroadcasting) {
      broadcastFile(file);
    } else {
      setSelectedFile(file);
      setTranspose((file as any).last_transpose ?? 0);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      autoSyncToPartiture(file);
    }
  }, [activeSetlistSongs, currentSetlistIndex, files, broadcastFile, isBroadcasting, autoSyncToPartiture]);

  // Swipe toggle handler
  const handleSwipeToggle = useCallback((enabled: boolean) => {
    setSwipeEnabled(enabled);
    safeSetItem('local', 'songbook_swipe_enabled', enabled ? 'true' : 'false');
  }, []);

  // Touch handlers for swipe navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!swipeEnabled || !activeSetlistSongs) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    swipeLockedRef.current = null;
  }, [swipeEnabled, activeSetlistSongs]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !swipeEnabled || !activeSetlistSongs) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    if (!swipeLockedRef.current && (dx > 10 || dy > 10)) {
      swipeLockedRef.current = dx > dy ? 'horizontal' : 'vertical';
    }
    if (swipeLockedRef.current === 'horizontal') e.preventDefault();
  }, [swipeEnabled, activeSetlistSongs]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !swipeEnabled || !activeSetlistSongs) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const elapsed = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;
    if (swipeLockedRef.current === 'horizontal' && Math.abs(dx) > 60 && elapsed < 500) {
      if (dx < 0 && canGoNext) handleSetlistNav('next');
      else if (dx > 0 && canGoPrev) handleSetlistNav('prev');
    }
    swipeLockedRef.current = null;
  }, [swipeEnabled, activeSetlistSongs, canGoNext, canGoPrev, handleSetlistNav]);

  const handleTranspose = (delta: number) => {
    setTranspose(prev => {
      const newVal = prev + delta;
      if (newVal > 11) return newVal - 12;
      if (newVal < -11) return newVal + 12;
      return newVal;
    });
  };

  const handleBack = () => {
    if (selectedFile) {
      if (isBroadcasting) {
        syncUpdate({
          songbook_mode: false,
          songbook_file_id: null,
          display_mode: 'waiting',
          is_broadcasting: false,
          is_active: false,
          scroll_position: 0,
        });
      }
      setSelectedFile(null);
      setActiveSetlistSongs(null);
    } else {
      navigate(-1);
    }
  };

  // ─── Settings Drawer (right side) ───
  const SettingsDrawer = (
    <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
          <Settings2 className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(85vw,340px)] p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="text-base font-semibold font-sans">Impostazioni</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-5 py-4">
          <div className="space-y-6">
            {/* Tonalità */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tonalità</p>
              <div className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-3">
                <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl" onClick={() => handleTranspose(-1)}>
                  <Minus className="w-5 h-5" />
                </Button>
                <span className="font-mono text-lg font-semibold w-14 text-center">
                  {transpose > 0 ? '+' : ''}{transpose}
                </span>
                <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl" onClick={() => handleTranspose(1)}>
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Visualizzazione</p>
              
              <SettingRow
                icon={<Palette className="w-4 h-4" />}
                label="Accordi Colorati"
                checked={coloredChords}
                onChange={setColoredChords}
              />
              <SettingRow
                icon={showChordsOnTV ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                label="Accordi su TV"
                checked={showChordsOnTV}
                onChange={(checked) => {
                  setShowChordsOnTV(checked);
                  syncUpdate({ songbook_show_chords_on_tv: checked });
                }}
              />
              <SettingRow
                icon={<Highlighter className="w-4 h-4" />}
                label="Evidenziazione testo"
                description={`${highlightLines} righe`}
                checked={highlightLines > 0}
                onChange={(checked) => {
                  const val = checked ? 2 : 0;
                  setHighlightLines(val);
                  syncUpdate({ highlight_lines_count: val, highlight_enabled: checked });
                }}
              />


              {/* Text scale slider */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Dimensione testo</span>
                  <span className="text-xs font-mono text-muted-foreground">{localTextScale}%</span>
                </div>
                <Slider
                  value={[localTextScale]}
                  onValueChange={([v]) => handleTextScaleChange(v)}
                  min={50}
                  max={200}
                  step={10}
                />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>50%</span>
                  <button 
                    className="underline"
                    onClick={() => handleTextScaleChange(100)}
                  >
                    Reset 100%
                  </button>
                  <span>200%</span>
                </div>
              </div>
            </div>

            {/* Destinazioni broadcast */}
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Destinazione</p>
              <SettingRow
                icon={<Tv className="w-4 h-4" />}
                label="Invia a TV"
                description="Trasmetti su /trasmetti"
                checked={(session as any)?.broadcast_to_tv ?? true}
                onChange={(checked) => {
                  syncUpdate({ broadcast_to_tv: checked });
                }}
              />
              <SettingRow
                icon={<Music className="w-4 h-4" />}
                label="Invia a Partiture"
                description="Trasmetti su /partiture"
                checked={(session as any)?.broadcast_to_partiture ?? true}
                onChange={(checked) => {
                  syncUpdate({ broadcast_to_partiture: checked });
                }}
              />
            </div>

            {/* Swipe */}
            {activeSetlistSongs && activeSetlistSongs.length > 1 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Navigazione</p>
                <SettingRow
                  icon={<MoveHorizontal className="w-4 h-4" />}
                  label="Swipe cambio brano"
                  checked={swipeEnabled}
                  onChange={handleSwipeToggle}
                />
              </div>
            )}

            {/* Auto scroll */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Auto-scroll</p>
              <div className="flex items-center justify-between">
                <Button
                  variant={autoScroll ? "default" : "outline"}
                  size="sm"
                  className="rounded-xl h-10 px-4"
                  onClick={() => setAutoScroll(!autoScroll)}
                >
                  {autoScroll ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {autoScroll ? 'Stop' : 'Avvia'}
                </Button>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Velocità</span>
                  <span className="text-xs text-muted-foreground font-mono">{scrollSpeed}</span>
                </div>
                <Slider
                  value={[scrollSpeed]}
                  onValueChange={([v]) => setScrollSpeed(v)}
                  min={10}
                  max={200}
                  step={10}
                />
              </div>
            </div>

            {/* Pedal status */}
            {pedalActive && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Pedale</p>
                <div className="flex items-center gap-3 bg-primary/10 rounded-xl px-4 py-3">
                  <Footprints className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Pedale connesso</p>
                    <p className="text-xs text-muted-foreground">
                      {pedalScrollActive ? 'Modalità scroll' : 'Modalità evidenziazione'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Connection info */}
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Connessione</p>
              <div className="flex items-center gap-3 bg-muted/40 rounded-xl px-4 py-3">
                {isLocalMode ? (
                  <>
                    <Server className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Rete Locale (LAN)</p>
                      <p className="text-xs text-muted-foreground">{localConnected ? 'Connesso' : 'Disconnesso'}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Radio className="w-5 h-5 text-secondary" />
                    <div>
                      <p className="text-sm font-medium">Cloud</p>
                      <p className="text-xs text-muted-foreground">Sincronizzazione attiva</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );

  // ─── FILE SELECTION VIEW ───
  if (!selectedFile) {
    return (
      <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
        {/* Header - Apple style */}
        <header className="shrink-0 z-50 bg-background/90 backdrop-blur-2xl border-b border-border/40 px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SongbookLiveDrawer
                files={files}
                onSelectFile={handleSelectFile}
                onBroadcastFile={handleBroadcastFile}
                onSetlistBroadcast={handleSetlistBroadcast}
              />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Guitar className="w-4 h-4 text-primary" />
                </div>
                <h1 className="font-bold text-lg font-sans">SongBook</h1>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {isFromCache && (
                <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30 bg-amber-500/5 rounded-lg">
                  <WifiOff className="w-3 h-3 mr-1" /> Offline
                </Badge>
              )}
              {isLocalMode && localConnected && (
                <Badge variant="outline" className="text-xs text-green-500 border-green-500/30 bg-green-500/5 rounded-lg">
                  <Server className="w-3 h-3 mr-1" /> LAN
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs rounded-lg">{filteredFiles.length}</Badge>
            </div>
          </div>
        </header>

        {/* Search Bar + Sort */}
        <div className="px-4 py-3 border-b border-border/40 bg-background/90 backdrop-blur-xl space-y-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca titolo o artista..."
              className="pl-10 h-11 bg-muted/50 border-0 rounded-xl focus:bg-muted/80 transition-colors"
            />
          </div>
          <div className="flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {(['title', 'artist', 'recent'] as const).map((m) => (
              <button
                key={m}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                  sortMode === m 
                    ? "bg-foreground text-background" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setSortMode(m)}
              >
                {m === 'title' ? 'Titolo' : m === 'artist' ? 'Artista' : 'Recenti'}
              </button>
            ))}
          </div>
        </div>

        {/* Currently broadcasting banner */}
        {broadcastingFile && (
          <div 
            className="mx-4 mt-3 p-3 rounded-2xl bg-destructive/5 border border-destructive/20 cursor-pointer hover:bg-destructive/10 transition-all active:scale-[0.98]"
            onClick={() => handleSelectFile(broadcastingFile)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <Tv className="w-5 h-5 text-destructive animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0 h-4 rounded-md">LIVE</Badge>
                  <p className="font-semibold truncate text-sm">{broadcastingFile.title}</p>
                </div>
                {broadcastingFile.artist && (
                  <p className="text-xs text-muted-foreground truncate">{broadcastingFile.artist}</p>
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 -rotate-90" />
            </div>
          </div>
        )}

        {/* File List */}
        <div className="flex-1 min-h-0 overflow-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                <Guitar className="w-8 h-8 opacity-40" />
              </div>
              {searchQuery ? (
                <p className="font-medium">Nessun risultato per "{searchQuery}"</p>
              ) : (
                <>
                  <p className="font-medium">Nessun file ChordPro</p>
                  <p className="text-sm mt-1 opacity-70">Carica file .cho dalla sezione Admin</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="rounded-xl hover:bg-muted/40 active:bg-muted/60 transition-colors px-2.5 py-2"
                >
                  <div 
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => handleSelectFile(file)}
                  >
                    <Music className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate leading-snug">{file.title}</p>
                      {file.artist && (
                        <p className="text-[11px] text-muted-foreground truncate leading-snug">{file.artist}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 pl-5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] px-2.5 rounded-lg"
                      onClick={() => handleBroadcastFile(file)}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Avvia
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px] px-2.5 rounded-lg"
                      onClick={() => handleSelectFile(file)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Mostra
                    </Button>
                    {setlists.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2.5 rounded-lg">
                            <ListPlus className="w-3 h-3 mr-1" />
                            Scaletta
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="min-w-[160px]">
                          {setlists.map((sl) => (
                            <DropdownMenuItem 
                              key={sl.id}
                              onClick={() => handleAddToSetlist(file, sl.id)}
                            >
                              {sl.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── SONG VIEW ───
  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Header - clean Apple style */}
      <header className="shrink-0 z-50 bg-background/90 backdrop-blur-2xl border-b border-border/40 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <SongbookLiveDrawer
              files={files}
              onSelectFile={handleSelectFile}
              onBroadcastFile={handleBroadcastFile}
              onSetlistBroadcast={handleSetlistBroadcast}
            />
            <Button variant="ghost" size="icon" onClick={handleBack} className="h-9 w-9 rounded-xl shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="font-semibold text-sm truncate font-sans">{selectedFile.title}</h1>
              {selectedFile.artist && (
                <p className="text-[11px] text-muted-foreground truncate">{selectedFile.artist}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {transpose !== 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 rounded-md font-mono">
                {transpose > 0 ? '+' : ''}{transpose}
              </Badge>
            )}
            {isThisFileBroadcasting ? (
              <Badge className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0 h-5 rounded-md animate-pulse">
                <Tv className="w-3 h-3 mr-0.5" /> LIVE
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 rounded-md text-muted-foreground">
                <Tv className="w-3 h-3 mr-0.5" /> OFF
              </Badge>
            )}
            {SettingsDrawer}
          </div>
        </div>
      </header>

      {/* Broadcast + Setlist Nav - compact bar */}
      <div className="bg-muted/30 border-b border-border/30 px-3 py-2 shrink-0 space-y-1.5">
        {/* Broadcast button */}
        <div className="flex items-center gap-2">
          {isThisFileBroadcasting ? (
            <Button 
              variant="destructive" 
              size="sm"
              className="flex-1 rounded-xl h-10 font-semibold"
              onClick={handleStopBroadcast}
            >
              <Square className="w-4 h-4 mr-2" />
              Arresta
            </Button>
          ) : (
            <Button 
              size="sm"
              className="flex-1 rounded-xl h-10 bg-primary hover:bg-primary/90 font-semibold"
              onClick={handleStartBroadcast}
            >
              <Play className="w-4 h-4 mr-2" />
              Trasmetti
            </Button>
          )}
          {/* Quick scroll */}
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl shrink-0" onClick={() => handleManualScroll('up')}>
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl shrink-0" onClick={() => handleManualScroll('down')}>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>

        {/* Prev/Next */}
        {activeSetlistSongs && activeSetlistSongs.length > 1 && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 rounded-xl text-xs"
              disabled={!canGoPrev}
              onClick={() => handleSetlistNav('prev')}
            >
              <SkipBack className="w-3.5 h-3.5 mr-1" />
              Prec
            </Button>
            <Badge variant="secondary" className="shrink-0 text-[10px] px-2 py-0.5 rounded-lg font-mono">
              {currentSetlistIndex + 1}/{activeSetlistSongs.length}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 rounded-xl text-xs"
              disabled={!canGoNext}
              onClick={() => handleSetlistNav('next')}
            >
              Succ
              <SkipForward className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* Song Content */}
      <div 
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-auto px-4 py-6"
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {parsedSong && (
          <div 
            className="font-mono whitespace-pre-wrap leading-relaxed text-foreground"
            style={{ fontSize: `${Math.max(12, 14 * fontSize / 100)}px` }}
          >
            {coloredChords 
              ? renderResponsiveSong(parsedSong, { coloredChords: true }) 
              : renderLyricsOnlyNodes(parsedSong)
            }
          </div>
        )}
      </div>

      {/* Pedal indicator (floating, non-intrusive) */}
      {pedalActive && (
        <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+8px)] left-1/2 -translate-x-1/2 z-40">
          <Badge variant="outline" className="bg-background/90 backdrop-blur-sm text-primary border-primary/30 rounded-full px-3 py-1 shadow-lg">
            <Footprints className="w-3.5 h-3.5 mr-1.5" />
            {pedalScrollActive ? 'Pedale scroll' : 'Pedale highlight'}
          </Badge>
        </div>
      )}
    </div>
  );
}

// ─── Setting Row Component ───
function SettingRow({ icon, label, description, checked, onChange }: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-1">
      <div className="flex items-center gap-3 min-w-0">
        <div className="text-muted-foreground">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
