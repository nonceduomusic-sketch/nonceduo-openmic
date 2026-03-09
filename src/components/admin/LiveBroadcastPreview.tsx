import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { resolveStandbyMode, STANDBY_DEFAULTS, STANDBY_QR_URLS } from '@/lib/tvStandbyModes';
import { useHybridBroadcast } from '@/hooks/useHybridBroadcast';
import { useScrollPositionPublisher } from '@/hooks/useScrollPositionPublisher';
import { useSongbookFiles } from '@/hooks/useSongbook';
import { supabase } from '@/integrations/supabase/client';
import { 
  ChevronUp, ChevronDown, Play, Pause, RotateCcw, ZoomIn, ZoomOut, Square, 
  Mic, ExternalLink, Maximize, Monitor, Minimize2, Radio, Eye, QrCode, Highlighter,
  AlignLeft, AlignCenter, AlignRight, Hand, Rows3, Guitar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import brandLogoText from '@/assets/brand-logo-text.png';
import QRCode from 'qrcode';
import { ScreenShareButton } from './ScreenShareButton';
import { ScreenStreamButton } from './ScreenStreamButton';
import { parseChordPro, transposeSong, ChordProSong, ChordProLine } from '@/lib/chordpro';
 
 interface Song {
   id: string;
   titolo: string;
   artista: string;
   testo: string | null;
 }

 interface SongbookFile {
   id: string;
   title: string;
   artist: string | null;
   content: string;
 }
 
 interface LiveBroadcastPreviewProps {
   canManage?: boolean;
 }
 
 type ViewMode = 'compact' | 'karaoke' | 'spotify' | 'chordpro';
 
 const BACKGROUND_COLORS = [
   'from-purple-600 to-purple-900', 'from-blue-500 to-blue-800', 'from-green-500 to-green-800',
   'from-orange-500 to-orange-800', 'from-pink-500 to-pink-800', 'from-cyan-500 to-cyan-800',
   'from-rose-500 to-rose-800', 'from-indigo-500 to-indigo-800', 'from-teal-500 to-teal-800',
 ];
 
 const getColorForSong = (id: string): string => {
   let hash = 0;
   for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
   return BACKGROUND_COLORS[Math.abs(hash) % BACKGROUND_COLORS.length];
 };
 
 export function LiveBroadcastPreview({ canManage = true }: LiveBroadcastPreviewProps) {
   const { session, syncUpdate } = useHybridBroadcast('main');
   const { files: songbookFiles } = useSongbookFiles();
   const [currentSong, setCurrentSong] = useState<Song | null>(null);
   const [currentSongbookFile, setCurrentSongbookFile] = useState<SongbookFile | null>(null);
   const [localHighlightLine, setLocalHighlightLine] = useState(0);
   const [autoScroll, setAutoScroll] = useState(false);
   const [autoScrollBpm, setAutoScrollBpm] = useState(60);
   const [scrollSpeed, setScrollSpeed] = useState(3);
   const [fontSize, setFontSize] = useState(100);
   const [viewMode, setViewMode] = useState<ViewMode>('karaoke');
   const [activeTab, setActiveTab] = useState<'waiting' | 'content'>('waiting');
   const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
   const [isExpanded, setIsExpanded] = useState(false);
  const [highlightEnabled, setHighlightEnabled] = useState(true);
    const [highlightLinesCount, setHighlightLinesCount] = useState<number>(1);
    const [highlightStyle, setHighlightStyle] = useState<'gradient' | 'uniform' | 'uniform-gradient'>('gradient');
    // Guard refs to prevent session sync from reverting local changes
    const lastLocalLinesCountUpdate = useRef(0);
    const lastLocalStyleUpdate = useRef(0);
    const lastLocalFontSizeUpdate = useRef(0);
    const lastLocalTextAlignUpdate = useRef(0);
    const lastLocalHighlightEnabledUpdate = useRef(0);
    const lastLocalRemoteScrollUpdate = useRef(0);
    const lastLocalViewModeUpdate = useRef(0);
    const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
   const [remoteScrollEnabled, setRemoteScrollEnabled] = useState(true);
   const lyricsRef = useRef<HTMLDivElement>(null);
   const isMobile = useIsMobile();

   // SongBook mode state from session
   // In dual broadcast, Contenuto Live should show catalog text (like Trasmetti), not songbook
   const isDualBroadcast = (session as any)?.dual_broadcast ?? false;
   const isSongbookMode = !isDualBroadcast && ((session as any)?.songbook_mode ?? false);
   const songbookFileId = (session as any)?.songbook_file_id ?? null;
   const songbookTranspose = (session as any)?.songbook_transpose ?? 0;
   const songbookShowChords = (session as any)?.songbook_show_chords_on_tv ?? false;

   // Parse songbook file
   const parsedSongbook: ChordProSong | null = useMemo(() => {
     if (!currentSongbookFile) return null;
     const parsed = parseChordPro(currentSongbookFile.content);
     return transposeSong(parsed, songbookTranspose);
   }, [currentSongbookFile, songbookTranspose]);

   // Fetch songbook file when in songbook mode (with cache fallback)
   useEffect(() => {
     if (isSongbookMode && songbookFileId) {
       // Try from loaded files first
       const file = songbookFiles.find(f => f.id === songbookFileId);
       if (file) {
         setCurrentSongbookFile(file);
         setActiveTab('content');
       } else {
         // Fallback to cache (offline)
         import('@/lib/songbookCache').then(({ getCachedFile }) => {
           getCachedFile(songbookFileId).then(cached => {
             if (cached) {
               setCurrentSongbookFile({ id: cached.id, title: cached.title, artist: cached.artist, content: cached.content });
               setActiveTab('content');
             }
           });
         });
       }
     } else if (!isSongbookMode) {
       setCurrentSongbookFile(null);
     }
   }, [isSongbookMode, songbookFileId, songbookFiles]);

   // Line mapping preserving raw indices for cross-view sync in songbook mode
   const lineMapping = useMemo(() => {
     if (isSongbookMode && parsedSongbook) {
       return parsedSongbook.lines
         .map((l, rawIdx) => ({ text: l.text || '', rawIndex: rawIdx, type: l.type }))
         .filter(l => l.type === 'chord-text' || l.type === 'text');
     }
     const textLines = currentSong?.testo?.split('\n').filter(line => line.trim()) || [];
     return textLines.map((text, i) => ({ text, rawIndex: i, type: 'text' as const }));
   }, [isSongbookMode, parsedSongbook, currentSong?.testo]);

   const contentLines = lineMapping.map(l => l.text);

   // Convert raw highlight_line to visual index for display
   const highlightVisualIndex = useMemo(() => {
     return lineMapping.findIndex(l => l.rawIndex === localHighlightLine);
   }, [lineMapping, localHighlightLine]);

   // Check if there's any content to show
   const hasContent = isSongbookMode ? !!parsedSongbook : !!currentSong;
   const contentTitle = isSongbookMode ? currentSongbookFile?.title : currentSong?.titolo;
   const contentArtist = isSongbookMode ? currentSongbookFile?.artist : currentSong?.artista;

  const { onScroll: onAdminLyricsScroll } = useScrollPositionPublisher({
    enabled: !!canManage && remoteScrollEnabled,
    publish: (ratio) => syncUpdate({ scroll_position: ratio }),
  });

  const handleLyricsScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    // In modalità evidenziazione usiamo highlight_line; in modalità "foglio" (highlight OFF) pubblichiamo lo scroll.
    if (highlightEnabled) return;
    onAdminLyricsScroll(e.currentTarget);
  }, [highlightEnabled, onAdminLyricsScroll]);
 
  const tvSettings = useMemo(() => ({
    title: (session as any)?.tv_title ?? 'Open Mic',
    subtitle: (session as any)?.tv_subtitle ?? 'NonceDuo Live Experience',
    footer: (session as any)?.tv_footer ?? 'Powered by NonceDuo',
    logoUrl: (session as any)?.tv_logo_url ?? '',
    showLogo: (session as any)?.tv_show_logo ?? true,
     showQr: (session as any)?.tv_show_qr ?? true,
     showTitle: (session as any)?.tv_show_title ?? true,
     showSubtitle: (session as any)?.tv_show_subtitle ?? true,
     showFooter: (session as any)?.tv_show_footer ?? true,
     showStatus: (session as any)?.tv_show_status ?? true,
     qrUrl: (session as any)?.tv_qr_url || '',
     qrCta: (session as any)?.tv_qr_cta || 'Scansiona per prenotare la tua canzone',
   }), [session]);
 
   const isBroadcasting = (session as any)?.is_broadcasting ?? false;
   // Use contentLines instead of lines for highlight navigation
   const lines = contentLines;
 
   // Generate QR code
   useEffect(() => {
     const generateQR = async () => {
       try {
         const qrDestination = tvSettings.qrUrl || 'https://nonceduo.com';
         const fullUrl = qrDestination.startsWith('http') ? qrDestination : `${window.location.origin}${qrDestination.startsWith('/') ? '' : '/'}${qrDestination}`;
         const dataUrl = await QRCode.toDataURL(fullUrl, { width: 160, margin: 2, color: { dark: '#000000', light: '#ffffff' }, errorCorrectionLevel: 'M' });
         setQrCodeDataUrl(dataUrl);
       } catch (err) { console.error('QR generation error:', err); }
     };
     generateQR();
   }, [tvSettings.qrUrl]);
 
   // Auto-switch to content when broadcasting (either lyrics or songbook)
   useEffect(() => {
     if (isBroadcasting && hasContent) setActiveTab('content');
   }, [isBroadcasting, hasContent]);
 
    // Sync viewMode from session (skip if locally changed recently)
    useEffect(() => {
      if (Date.now() - lastLocalViewModeUpdate.current < 2000) return;
      const sessionViewMode = isSongbookMode 
        ? (session as any)?.songbook_view_mode 
        : (session as any)?.tv_view_mode;
      if (sessionViewMode && ['compact', 'karaoke', 'spotify', 'chordpro'].includes(sessionViewMode)) {
        setViewMode(sessionViewMode as ViewMode);
      }
    }, [(session as any)?.tv_view_mode, (session as any)?.songbook_view_mode, isSongbookMode]);

  // Sync highlightEnabled from session (skip if locally changed recently)
  useEffect(() => {
    if (Date.now() - lastLocalHighlightEnabledUpdate.current < 2000) return;
    const sessionHighlight = (session as any)?.highlight_enabled;
    if (sessionHighlight !== undefined) {
      setHighlightEnabled(sessionHighlight);
    }
  }, [(session as any)?.highlight_enabled]);

  // Sync highlightLinesCount from session (skip if locally changed recently)
  useEffect(() => {
    if (Date.now() - lastLocalLinesCountUpdate.current < 2000) return;
    const sessionLinesCount = (session as any)?.highlight_lines_count;
    if (sessionLinesCount !== undefined && sessionLinesCount !== null) {
      setHighlightLinesCount(sessionLinesCount);
    }
  }, [(session as any)?.highlight_lines_count]);

  // Sync highlightStyle from session (skip if locally changed recently)
  useEffect(() => {
    if (Date.now() - lastLocalStyleUpdate.current < 2000) return;
    const sessionStyle = (session as any)?.highlight_style;
    if (sessionStyle === 'gradient' || sessionStyle === 'uniform' || sessionStyle === 'uniform-gradient') {
      setHighlightStyle(sessionStyle);
    }
  }, [(session as any)?.highlight_style]);

  // Sync fontSize from session (skip if locally changed recently)
  useEffect(() => {
    if (Date.now() - lastLocalFontSizeUpdate.current < 2000) return;
    const sessionFontSize = (session as any)?.font_size;
    if (sessionFontSize !== undefined && sessionFontSize !== null) {
      setFontSize(sessionFontSize);
    }
  }, [(session as any)?.font_size]);

  // Sync textAlign from session (skip if locally changed recently)
  useEffect(() => {
    if (Date.now() - lastLocalTextAlignUpdate.current < 2000) return;
    const sessionTextAlign = (session as any)?.text_align;
    if (sessionTextAlign && ['left', 'center', 'right'].includes(sessionTextAlign)) {
      setTextAlign(sessionTextAlign);
    }
  }, [(session as any)?.text_align]);

  // Sync remoteScrollEnabled from session (skip if locally changed recently)
  useEffect(() => {
    if (Date.now() - lastLocalRemoteScrollUpdate.current < 2000) return;
    const sessionRemoteScroll = (session as any)?.remote_scroll_enabled;
    if (sessionRemoteScroll !== undefined) {
      setRemoteScrollEnabled(sessionRemoteScroll);
    }
  }, [(session as any)?.remote_scroll_enabled]);
 
    // Fetch current song — only when song ID changes (NOT on highlight_line changes)
    // Fallback chain: Cloud (with timeout) → IndexedDB cache
    useEffect(() => {
      const fetchSong = async () => {
        if (!session?.current_song_id) { setCurrentSong(null); setLocalHighlightLine(0); return; }
        
        // 1) Try Cloud with timeout
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          const { data } = await supabase
            .from('songs')
            .select('id, titolo, artista, testo')
            .eq('id', session.current_song_id)
            .abortSignal(controller.signal)
            .single();
          clearTimeout(timeout);
          if (data) { setCurrentSong(data); setLocalHighlightLine(0); return; }
        } catch {
          console.log('[LivePreview] Cloud song fetch failed, trying cache...');
        }
        
        // 2) Fallback to IndexedDB cache
        try {
          const { getCachedSongById } = await import('@/lib/songsCatalogCache');
          const cached = await getCachedSongById(session.current_song_id);
          if (cached) {
            setCurrentSong({ id: cached.id, titolo: cached.titolo, artista: cached.artista, testo: cached.testo });
            setLocalHighlightLine(0);
          }
        } catch {
          console.warn('[LivePreview] Cache fallback also failed');
        }
      };
      fetchSong();
    }, [session?.current_song_id]);
 
   // Sync highlight line
   useEffect(() => {
     if (session?.highlight_line !== undefined) setLocalHighlightLine(session.highlight_line);
   }, [session?.highlight_line]);
 
   // Auto-scroll
   useEffect(() => {
     if (!autoScroll || !lineMapping.length) return;
     const interval = setInterval(async () => {
        setLocalHighlightLine(prev => {
          const currentVisual = lineMapping.findIndex(l => l.rawIndex === prev);
          const nextVisual = Math.min(lineMapping.length - 1, currentVisual + 1);
          const nextRaw = lineMapping[nextVisual]?.rawIndex ?? prev;
          syncUpdate({ highlight_line: nextRaw, auto_scroll: true });
          return nextRaw;
        });
      }, (6 - scrollSpeed) * 1500);
      return () => clearInterval(interval);
    }, [autoScroll, lineMapping, scrollSpeed, syncUpdate]);
 
  // Scroll within container — center the GROUP of highlighted lines
  useEffect(() => {
    if (!highlightEnabled) return;

    if (lyricsRef.current && lines.length > 0) {
      const container = lyricsRef.current;
      const firstEl = container.querySelector(`[data-line="${localHighlightLine}"]`) as HTMLElement;
      if (!firstEl) return;

      const lastHighlightIdx = localHighlightLine + highlightLinesCount - 1;
      const lastEl = container.querySelector(`[data-line="${lastHighlightIdx}"]`) as HTMLElement;

      const groupTop = firstEl.offsetTop;
      const groupBottom = lastEl 
        ? lastEl.offsetTop + lastEl.offsetHeight 
        : firstEl.offsetTop + firstEl.offsetHeight;
      const groupCenter = (groupTop + groupBottom) / 2;
      const scrollTarget = groupCenter - container.clientHeight / 2;

      container.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' });
    }
  }, [localHighlightLine, highlightLinesCount, lines.length, highlightEnabled]);
 
   const handleLineChange = useCallback(async (direction: 'up' | 'down') => {
     if (!canManage) return;
     const currentVisual = lineMapping.findIndex(l => l.rawIndex === localHighlightLine);
     const newVisual = direction === 'up' ? Math.max(0, currentVisual - 1) : Math.min(lineMapping.length - 1, currentVisual + 1);
    const newRaw = lineMapping[newVisual]?.rawIndex ?? 0;
      setLocalHighlightLine(newRaw);
      setAutoScroll(false);
      syncUpdate({ highlight_line: newRaw, auto_scroll: false });
    }, [canManage, localHighlightLine, lineMapping, syncUpdate]);
 
   const handleLineClick = useCallback(async (visualIndex: number) => {
     if (!canManage) return;
      const rawIndex = lineMapping[visualIndex]?.rawIndex ?? visualIndex;
      setLocalHighlightLine(rawIndex);
      setAutoScroll(false);
      syncUpdate({ highlight_line: rawIndex, auto_scroll: false });
    }, [canManage, lineMapping, syncUpdate]);
 
   const handleReset = useCallback(async () => {
     if (!canManage) return;
      const firstRaw = lineMapping[0]?.rawIndex ?? 0;
      setLocalHighlightLine(firstRaw);
      setAutoScroll(false);
      syncUpdate({ highlight_line: firstRaw, auto_scroll: false });
    }, [canManage, lineMapping, syncUpdate]);
 
   const handleStopBroadcast = useCallback(async () => {
     if (!canManage) return;
      syncUpdate({ 
        is_broadcasting: false, 
        display_mode: 'waiting', 
        current_song_id: null, 
        current_reservation_id: null, 
        songbook_mode: false,
        songbook_file_id: null,
        highlight_line: 0, 
        auto_scroll: false 
      });
      setAutoScroll(false);
      setCurrentSongbookFile(null);
      toast.success('Trasmissione interrotta - TV in attesa');
    }, [canManage, syncUpdate]);
 
   const handleStartBroadcast = useCallback(async () => {
     if (!canManage || !hasContent) return;
     
     if (isSongbookMode && currentSongbookFile) {
       // Already in SongBook mode - just ensure broadcasting
        syncUpdate({ 
          is_broadcasting: true, 
          display_mode: 'lyrics',
          songbook_mode: true,
          songbook_file_id: currentSongbookFile.id,
        });
        toast.success('Trasmissione SongBook avviata!');
      } else if (currentSong) {
        // Normal lyrics mode
        syncUpdate({ is_broadcasting: true, display_mode: 'lyrics', tv_view_mode: viewMode });
        toast.success(`Trasmissione avviata! Stile: ${viewMode === 'spotify' ? 'Spotify' : viewMode === 'karaoke' ? 'Karaoke' : 'Compatta'}`);
      }
    }, [canManage, hasContent, isSongbookMode, currentSongbookFile, currentSong, viewMode, syncUpdate]);
 
   const handleToggleAutoScroll = useCallback(async () => {
     const newAutoScroll = !autoScroll;
      setAutoScroll(newAutoScroll);
      syncUpdate({ auto_scroll_active: newAutoScroll, auto_scroll_bpm: autoScrollBpm });
      if (newAutoScroll) toast.success(`Auto-scroll attivato (${autoScrollBpm} BPM)`);
      else toast.info('Auto-scroll disattivato');
    }, [autoScroll, autoScrollBpm, syncUpdate]);
 
   const handleAutoScrollBpmChange = useCallback(async (delta: number) => {
     const newBpm = Math.max(20, Math.min(200, autoScrollBpm + delta));
      setAutoScrollBpm(newBpm);
      if (autoScroll) {
        syncUpdate({ auto_scroll_bpm: newBpm });
      }
    }, [autoScroll, autoScrollBpm, syncUpdate]);
 
  const handleViewModeChange = useCallback(async (mode: ViewMode) => {
    lastLocalViewModeUpdate.current = Date.now();
    setViewMode(mode);
    const updates: any = { tv_view_mode: mode };
    if (isSongbookMode) {
      updates.songbook_view_mode = mode;
    }
    syncUpdate(updates);
  }, [syncUpdate, isSongbookMode]);

  const handleToggleHighlight = useCallback(async () => {
    lastLocalHighlightEnabledUpdate.current = Date.now();
    const newValue = !highlightEnabled;
    setHighlightEnabled(newValue);
    syncUpdate({ highlight_enabled: newValue });
    toast.success(newValue ? 'Evidenziazione attivata' : 'Evidenziazione disattivata');
  }, [highlightEnabled, syncUpdate]);

  // Handle highlight lines count change
  const handleHighlightLinesCountChange = useCallback(async (value: string) => {
    const count = parseInt(value, 10);
    if (count >= 1 && count <= 6) {
      lastLocalLinesCountUpdate.current = Date.now();
      setHighlightLinesCount(count);
      syncUpdate({ highlight_lines_count: count });
      toast.success(`Righe evidenziate: ${count}`);
    }
  }, [syncUpdate]);

  // Handle highlight style change
  const handleHighlightStyleChange = useCallback(async (style: 'gradient' | 'uniform' | 'uniform-gradient') => {
    lastLocalStyleUpdate.current = Date.now();
    setHighlightStyle(style);
    syncUpdate({ highlight_style: style });
    const labels: Record<string, string> = { gradient: 'Gradiente', uniform: 'Uniforme', 'uniform-gradient': 'Risalto' };
    toast.success(`Stile: ${labels[style]}`);
  }, [syncUpdate]);

  // Font size change synced to DB
  const handleFontSizeChange = useCallback(async (delta: number) => {
    lastLocalFontSizeUpdate.current = Date.now();
    const newSize = Math.max(50, Math.min(300, fontSize + delta));
    setFontSize(newSize);
    syncUpdate({ font_size: newSize });
  }, [fontSize, syncUpdate]);

  // Text align change synced to DB
  const handleTextAlignChange = useCallback(async (align: 'left' | 'center' | 'right') => {
    lastLocalTextAlignUpdate.current = Date.now();
    setTextAlign(align);
    syncUpdate({ text_align: align });
  }, [syncUpdate]);

  // Remote scroll toggle synced to DB
  const handleToggleRemoteScroll = useCallback(async (enabled: boolean) => {
    lastLocalRemoteScrollUpdate.current = Date.now();
    setRemoteScrollEnabled(enabled);
    syncUpdate({ remote_scroll_enabled: enabled });
    toast.success(enabled ? 'Scroll da telecomando abilitato' : 'Scroll da telecomando disabilitato');
  }, [syncUpdate]);
 
   const openTVPage = () => window.open('/trasmetti', '_blank');
 
   // Waiting screen preview
   const renderWaitingPreview = () => (
     <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-900" style={{ minHeight: isExpanded ? (isMobile ? '50vh' : '60vh') : (isMobile ? '35vh' : '40vh') }}>
       <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-1/4 left-1/4 w-[150px] h-[150px] bg-primary/20 rounded-full blur-[80px] animate-pulse" />
         <div className="absolute bottom-1/4 right-1/4 w-[120px] h-[120px] bg-purple-500/15 rounded-full blur-[60px] animate-pulse" style={{ animationDelay: '1s' }} />
       </div>
       <div className="relative z-10 flex flex-col items-center justify-center h-full py-6 px-4 text-center" style={{ minHeight: isExpanded ? (isMobile ? '50vh' : '60vh') : (isMobile ? '35vh' : '40vh') }}>
         {tvSettings.showLogo && <img src={tvSettings.logoUrl || brandLogoText} alt="Logo" className="h-10 md:h-14 w-auto object-contain mb-4" onError={(e) => { (e.target as HTMLImageElement).src = brandLogoText; }} />}
         {tvSettings.showTitle && <h1 className="text-2xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent">{tvSettings.title}</h1>}
         {tvSettings.showSubtitle && <p className="text-sm md:text-lg text-white/60 mb-4">{tvSettings.subtitle}</p>}
         {tvSettings.showStatus && (
           <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full mb-4">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
             <span className="text-green-400 font-medium text-sm">Open Mic attivo – Prenota con QR</span>
           </div>
         )}
         {tvSettings.showQr && qrCodeDataUrl && <div className="bg-white rounded-xl p-3 shadow-xl mb-3"><img src={qrCodeDataUrl} alt="QR Code" className="w-24 h-24 md:w-32 md:h-32" /></div>}
         {tvSettings.showQr && <p className="text-xs md:text-sm text-white/60 mb-4 max-w-xs">{tvSettings.qrCta}</p>}
         {tvSettings.showFooter && <p className="text-white/30 text-xs absolute bottom-4">{tvSettings.footer}</p>}
       </div>
     </div>
   );
 
   // Lyrics preview (works for both normal songs and SongBook)
   const renderLyricsPreview = () => {
     if (!hasContent) return null;
     const containerHeight = isExpanded ? (isMobile ? '50vh' : '60vh') : (isMobile ? '35vh' : '40vh');
     const lyricsHeight = isExpanded ? (isMobile ? 'calc(50vh - 140px)' : 'calc(60vh - 160px)') : (isMobile ? 'calc(35vh - 120px)' : 'calc(40vh - 140px)');
     
     const contentId = isSongbookMode ? currentSongbookFile?.id : currentSong?.id;
     
     return (
       <div className={cn("relative rounded-xl overflow-hidden", viewMode === 'spotify' ? `bg-gradient-to-b ${getColorForSong(contentId || 'default')}` : viewMode === 'karaoke' ? "bg-gradient-to-b from-gray-900 via-black to-gray-900" : "bg-card border")} style={{ minHeight: containerHeight }}>
         {viewMode === 'karaoke' && (
           <div className="absolute inset-0 pointer-events-none">
             <div className="absolute top-0 left-1/4 w-[150px] h-[150px] bg-primary/15 rounded-full blur-[80px]" />
             <div className="absolute bottom-0 right-1/4 w-[100px] h-[100px] bg-purple-600/10 rounded-full blur-[60px]" />
           </div>
         )}
         <div className="relative z-10 px-3 pt-3 pb-2">
           <div className="flex items-center justify-between gap-2">
             <div className="min-w-0 flex-1">
               <h2 className={cn("font-bold truncate text-base md:text-lg", viewMode === 'compact' ? "text-foreground" : "text-white")} style={{ fontSize: `${Math.max(14, 16 * fontSize / 100)}px` }}>{contentTitle}</h2>
               <p className={cn("truncate text-sm", viewMode === 'compact' ? "text-muted-foreground" : "text-white/60")} style={{ fontSize: `${Math.max(12, 14 * fontSize / 100)}px` }}>{contentArtist}</p>
             </div>
             {isBroadcasting ? (
               <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs shrink-0"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-1" />LIVE</Badge>
             ) : (
               <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs shrink-0"><Eye className="w-3 h-3 mr-1" />ANTEPRIMA</Badge>
             )}
           </div>
         </div>
          <div
            ref={lyricsRef}
            onScroll={handleLyricsScroll}
            className="relative z-10 px-3 overflow-y-auto"
            style={{ height: lyricsHeight }}
          >
            {viewMode === 'spotify' ? (
               <div className={cn("bg-black/30 backdrop-blur-sm rounded-xl p-4 space-y-2", textAlign === 'left' ? 'text-left' : textAlign === 'right' ? 'text-right' : 'text-center')}>
                 {lines.map((line, index) => {
                   const isMainHighlight = highlightVisualIndex === index;
                    const distanceFromMain = index - highlightVisualIndex;
                    const isInHighlightRange = distanceFromMain >= 0 && distanceFromMain < highlightLinesCount;
                    const isPast = index < highlightVisualIndex;
                    let opacity = 1;
                    if (highlightEnabled) {
                      if (isInHighlightRange) {
                        opacity = highlightStyle === 'gradient' ? (isMainHighlight ? 1 : 0.85 - (distanceFromMain * 0.05)) : 1;
                      } else if (isPast) opacity = 0.35;
                      else opacity = 0.45;
                    }
                    // In uniform/uniform-gradient: all highlighted lines get same visual treatment
                    const showAsMain = highlightStyle !== 'gradient' ? isInHighlightRange : isMainHighlight;
                    const showAsSecondary = highlightStyle !== 'gradient' ? false : (isInHighlightRange && !isMainHighlight);
                   return (
                     <p key={index} data-line={index} onClick={() => handleLineClick(index)} className={cn(
                       "font-sans leading-loose transition-all duration-300 cursor-pointer py-2 px-4 -mx-1 rounded-lg text-white",
                       highlightEnabled && showAsMain && "bg-yellow-400/40 ring-2 ring-yellow-400/60 font-bold shadow-lg scale-[1.02]",
                       highlightEnabled && showAsSecondary && "bg-yellow-400/20 ring-1 ring-yellow-400/40",
                       !isInHighlightRange && "hover:bg-white/10"
                     )} style={{ fontSize: `${Math.max(14, 16 * fontSize / 100)}px`, opacity }}>{line || '\u00A0'}</p>
                   );
                 })}
               </div>
             ) : viewMode === 'karaoke' ? (
               <div className={cn("space-y-2 py-4", textAlign === 'left' ? 'text-left' : textAlign === 'right' ? 'text-right' : 'text-center')}>
                 {lines.map((line, index) => {
                   const isMainHighlight = highlightVisualIndex === index;
                    const distanceFromMain = index - highlightVisualIndex;
                    const isInHighlightRange = distanceFromMain >= 0 && distanceFromMain < highlightLinesCount;
                    const isPast = index < highlightVisualIndex;
                    const dist = Math.abs(index - highlightVisualIndex);
                    let opacity = 1;
                    if (highlightEnabled) {
                      if (isInHighlightRange) {
                        opacity = highlightStyle === 'gradient' ? (isMainHighlight ? 1 : 0.9 - (distanceFromMain * 0.05)) : 1;
                      } else if (isPast) opacity = 0.3;
                      else if (dist <= highlightLinesCount + 1) opacity = 0.6;
                      else opacity = 0.3;
                    }
                   const baseFontSize = Math.max(14, 16 * fontSize / 100);
                   const showAsMain = highlightStyle !== 'gradient' ? isInHighlightRange : isMainHighlight;
                   const showAsSecondary = highlightStyle !== 'gradient' ? false : (isInHighlightRange && !isMainHighlight);
                   return (
                     <p key={index} data-line={index} onClick={() => handleLineClick(index)} className={cn(
                       "font-bold transition-all duration-500 cursor-pointer text-white py-2",
                       highlightEnabled && showAsMain && "text-primary scale-110 bg-primary/20 rounded-lg px-4 shadow-lg",
                       highlightEnabled && showAsSecondary && "text-primary/80 scale-105 bg-primary/10 rounded-lg px-3"
                     )} style={{ 
                       fontSize: (highlightEnabled && showAsMain) ? `${baseFontSize * 1.4}px` 
                         : (highlightEnabled && showAsSecondary) ? `${baseFontSize * 1.2}px`
                         : `${baseFontSize}px`, 
                       opacity, 
                       textShadow: (highlightEnabled && showAsMain) ? '0 0 40px hsl(var(--primary) / 0.6)' 
                         : (highlightEnabled && showAsSecondary) ? '0 0 25px hsl(var(--primary) / 0.4)'
                         : 'none' 
                     }}>{line || '\u00A0'}</p>
                   );
                 })}
               </div>
             ) : (
               /* COMPACT MODE */
               <div className={cn("space-y-1 py-4", textAlign === 'left' ? 'text-left' : textAlign === 'right' ? 'text-right' : 'text-center')}>
                 {lines.map((line, index) => {
                   const isMainHighlight = highlightVisualIndex === index;
                    const distanceFromMain = index - highlightVisualIndex;
                    const isInHighlightRange = distanceFromMain >= 0 && distanceFromMain < highlightLinesCount;
                    let opacity = 1;
                    if (highlightEnabled) {
                      if (isInHighlightRange) {
                        opacity = highlightStyle === 'gradient' ? (isMainHighlight ? 1 : 0.9 - (distanceFromMain * 0.05)) : 1;
                      } else opacity = 0.5;
                    }
                    const showAsMain = highlightStyle !== 'gradient' ? isInHighlightRange : isMainHighlight;
                    const showAsSecondary = highlightStyle !== 'gradient' ? false : (isInHighlightRange && !isMainHighlight);
                   return (
                     <p key={index} data-line={index} onClick={() => handleLineClick(index)} className={cn(
                       "transition-all duration-300 cursor-pointer px-4 py-2 rounded-lg leading-relaxed",
                       highlightEnabled && showAsMain && "bg-primary text-primary-foreground font-bold shadow-md ring-2 ring-primary/50",
                       highlightEnabled && showAsSecondary && "bg-primary/70 text-primary-foreground ring-1 ring-primary/30",
                       !isInHighlightRange && "hover:bg-muted"
                     )} style={{ fontSize: `${Math.max(14, 16 * fontSize / 100)}px`, opacity }}>{line || '\u00A0'}</p>
                   );
                 })}
               </div>
             )}
          </div>
       </div>
     );
   };
 
   return (
     <Card className="border-2 border-primary/20">
       <CardHeader className="pb-3 px-3 md:px-6">
         <div className="flex items-center justify-between flex-wrap gap-2">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 rounded-xl"><Monitor className="w-5 h-5 text-primary" /></div>
             <div>
               <CardTitle className="text-base md:text-lg flex items-center gap-2">
                 Trasmissione Live
                 {isBroadcasting && <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />LIVE</Badge>}
               </CardTitle>
               <CardDescription className="text-xs md:text-sm">{isBroadcasting ? 'In onda sulla TV' : 'Anteprima'}</CardDescription>
             </div>
           </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors",
                  remoteScrollEnabled ? "border-green-500/50 bg-green-500/10" : "border-yellow-500/50 bg-yellow-500/10",
                )}
              >
                <Hand className={cn("w-4 h-4", remoteScrollEnabled ? "text-green-600" : "text-yellow-600")} />
                <Label className="text-xs font-medium cursor-pointer" htmlFor="remote-scroll-toggle">
                  Scroll
                </Label>
                <Switch
                  id="remote-scroll-toggle"
                  checked={remoteScrollEnabled}
                  onCheckedChange={handleToggleRemoteScroll}
                  disabled={!canManage}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>

              <Button variant="outline" size="sm" onClick={openTVPage} className="h-9">
                <ExternalLink className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Apri</span> TV
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="h-9">
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
            </div>
         </div>
       </CardHeader>
       <CardContent className="px-3 md:px-6 space-y-4">
         <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'waiting' | 'content')}>
           <TabsList className="grid w-full grid-cols-2 h-10">
             <TabsTrigger value="waiting" className="text-xs md:text-sm h-9"><QrCode className="w-4 h-4 mr-1.5" />Pagina Iniziale</TabsTrigger>
             <TabsTrigger value="content" className="text-xs md:text-sm h-9"><Mic className="w-4 h-4 mr-1.5" />Contenuto Live</TabsTrigger>
           </TabsList>
           <TabsContent value="waiting" className="mt-3">{renderWaitingPreview()}</TabsContent>
            <TabsContent value="content" className="mt-3 space-y-3">
              {hasContent ? (
                <>
                   {/* SongBook indicator */}
                   {isSongbookMode && (
                     <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded-lg">
                       <Guitar className="w-4 h-4 text-primary" />
                       <span className="text-sm font-medium text-primary">Modalità SongBook attiva</span>
                       {songbookShowChords && <Badge variant="secondary" className="text-xs">Accordi ON</Badge>}
                     </div>
                   )}

                   {/* Style selector + Highlight toggle + Remote scroll toggle */}
                   <div className="flex flex-wrap items-center gap-3">
                     <div className="flex flex-wrap items-center gap-2">
                       <Label className="text-xs text-muted-foreground">Stile:</Label>
                       {(['compact', 'karaoke', 'spotify'] as ViewMode[]).map((mode) => (
                         <Button key={mode} variant={viewMode === mode ? 'default' : 'outline'} size="sm" onClick={() => handleViewModeChange(mode)} className="h-8 text-xs capitalize">{mode === 'compact' ? 'Compatta' : mode === 'karaoke' ? 'Karaoke' : 'Spotify'}</Button>
                       ))}
                     </div>
                    </div>

                    {/* HIGHLIGHT TOGGLE - row 1 */}
                    <div className="w-full">
                      <Button
                        variant={highlightEnabled ? 'default' : 'outline'}
                        size="sm"
                        onClick={handleToggleHighlight}
                        disabled={!canManage}
                        className={cn(
                          "h-10 w-full sm:w-auto min-w-[160px] font-medium transition-all",
                          highlightEnabled 
                            ? "bg-yellow-500 hover:bg-yellow-600 text-yellow-950" 
                            : "border-dashed"
                        )}
                      >
                        <Highlighter className="w-4 h-4 mr-2" />
                        Evidenziazione {highlightEnabled ? 'ON' : 'OFF'}
                      </Button>
                    </div>

                    {/* HIGHLIGHT OPTIONS - row 2, only when ON */}
                    {highlightEnabled && (
                      <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-2 px-3 py-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        {/* Lines count */}
                        <div className="flex items-center gap-2">
                          <Rows3 className="w-4 h-4 text-yellow-600 shrink-0" />
                          <Label className="text-xs font-medium text-yellow-700 whitespace-nowrap">Righe:</Label>
                          <Select
                            value={String(highlightLinesCount)}
                            onValueChange={handleHighlightLinesCountChange}
                            disabled={!canManage}
                          >
                            <SelectTrigger className="w-14 h-9 text-sm font-bold border-yellow-500/50 bg-yellow-500/20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1,2,3,4,5,6].map(n => (
                                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Style buttons */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant={highlightStyle === 'gradient' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleHighlightStyleChange('gradient')}
                            disabled={!canManage}
                            className="h-9 text-xs px-3 flex-1 sm:flex-none"
                            title="Prima riga più forte, le altre sfumano"
                          >
                            Gradiente
                          </Button>
                          <Button
                            variant={highlightStyle === 'uniform' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleHighlightStyleChange('uniform')}
                            disabled={!canManage}
                            className="h-9 text-xs px-3 flex-1 sm:flex-none"
                            title="Tutte le righe uguali, leggibili"
                          >
                            Uniforme
                          </Button>
                          <Button
                            variant={highlightStyle === 'uniform-gradient' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleHighlightStyleChange('uniform-gradient')}
                            disabled={!canManage}
                            className="h-9 text-xs px-3 flex-1 sm:flex-none"
                            title="Tutte le righe in risalto"
                          >
                            Risalto
                          </Button>
                        </div>
                      </div>
                    )}
                 {renderLyricsPreview()}
                  {/* Controls */}
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {isBroadcasting ? (
                        <Button variant="destructive" size="sm" onClick={handleStopBroadcast} disabled={!canManage} className="h-10"><Square className="w-4 h-4 mr-1" />Ferma</Button>
                      ) : (
                        <Button size="sm" onClick={handleStartBroadcast} disabled={!canManage || !hasContent} className="h-10 bg-primary hover:bg-primary/90"><Radio className="w-4 h-4 mr-1" />Avvia</Button>
                      )}
                      
                       {/* Screen Share Button - accanto ad Avvia */}
                       <ScreenShareButton salaCode="main" disabled={!canManage} />
                       
                       {/* ScreenStream Button - per l'app ScreenStream */}
                       <ScreenStreamButton salaCode="main" disabled={!canManage} />
                     <div className="flex items-center gap-1 bg-background rounded-lg p-1">
                       <Button variant="ghost" size="icon" onClick={() => handleLineChange('up')} disabled={!canManage || highlightVisualIndex <= 0} className="h-9 w-9"><ChevronUp className="w-5 h-5" /></Button>
                       <span className="px-2 min-w-[50px] text-center font-medium text-sm">{(highlightVisualIndex >= 0 ? highlightVisualIndex + 1 : 1)}/{lines.length || 1}</span>
                       <Button variant="ghost" size="icon" onClick={() => handleLineChange('down')} disabled={!canManage || highlightVisualIndex >= lines.length - 1} className="h-9 w-9"><ChevronDown className="w-5 h-5" /></Button>
                     </div>
                    {/* Auto-scroll controls with BPM */}
                    <div className="flex items-center gap-1 bg-background rounded-lg p-1">
                      <Button 
                        variant={autoScroll ? "destructive" : "outline"} 
                        size="icon" 
                        onClick={handleToggleAutoScroll} 
                        disabled={!canManage} 
                        className="h-9 w-9"
                        title={autoScroll ? 'Ferma auto-scroll' : 'Avvia auto-scroll'}
                      >
                        {autoScroll ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleAutoScrollBpmChange(-10)} 
                        disabled={!canManage || autoScrollBpm <= 20}
                        className="h-8 w-8"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                      <span className="text-xs min-w-[48px] text-center font-mono">{autoScrollBpm} BPM</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleAutoScrollBpmChange(10)} 
                        disabled={!canManage || autoScrollBpm >= 200}
                        className="h-8 w-8"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1 bg-background rounded-lg p-1">
                      <Button variant="ghost" size="icon" onClick={() => handleFontSizeChange(-10)} className="h-8 w-8"><ZoomOut className="w-4 h-4" /></Button>
                      <span className="text-xs min-w-[32px] text-center">{fontSize}%</span>
                      <Button variant="ghost" size="icon" onClick={() => handleFontSizeChange(10)} className="h-8 w-8"><ZoomIn className="w-4 h-4" /></Button>
                    </div>
                    {/* Text Align Controls */}
                    <div className="flex items-center gap-1 bg-background rounded-lg p-1">
                      <Button variant={textAlign === 'left' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleTextAlignChange('left')} className="h-8 w-8"><AlignLeft className="w-4 h-4" /></Button>
                      <Button variant={textAlign === 'center' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleTextAlignChange('center')} className="h-8 w-8"><AlignCenter className="w-4 h-4" /></Button>
                      <Button variant={textAlign === 'right' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleTextAlignChange('right')} className="h-8 w-8"><AlignRight className="w-4 h-4" /></Button>
                    </div>
                    <Button variant="outline" size="icon" onClick={handleReset} disabled={!canManage} className="h-9 w-9"><RotateCcw className="w-4 h-4" /></Button>
                   </div>
                 </div>
               </>
             ) : (
               <div className="text-center py-12 text-muted-foreground">
                 <Mic className="w-12 h-12 mx-auto mb-4 opacity-30" />
                 <p className="text-base font-medium mb-2">Nessun contenuto selezionato</p>
                 <p className="text-sm">Seleziona dalla Scaletta, Catalogo o SongBook.</p>
               </div>
             )}
           </TabsContent>
         </Tabs>
       </CardContent>
     </Card>
   );
 }