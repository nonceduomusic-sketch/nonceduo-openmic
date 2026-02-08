import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useBroadcast } from '@/hooks/useBroadcast';
import { useScrollPositionPublisher } from '@/hooks/useScrollPositionPublisher';
import { supabase } from '@/integrations/supabase/client';
import { 
  ChevronUp, ChevronDown, Play, Pause, RotateCcw, ZoomIn, ZoomOut, Square, 
  Mic, ExternalLink, Maximize, Monitor, Minimize2, Radio, Eye, QrCode, Highlighter,
  AlignLeft, AlignCenter, AlignRight, Hand
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import brandLogoText from '@/assets/brand-logo-text.png';
import QRCode from 'qrcode';
 
 interface Song {
   id: string;
   titolo: string;
   artista: string;
   testo: string | null;
 }
 
 interface LiveBroadcastPreviewProps {
   canManage?: boolean;
 }
 
 type ViewMode = 'compact' | 'karaoke' | 'spotify';
 
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
   const { session, updateSession } = useBroadcast('main');
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [localHighlightLine, setLocalHighlightLine] = useState(0);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(3);
  const [fontSize, setFontSize] = useState(100);
  const [viewMode, setViewMode] = useState<ViewMode>('karaoke');
  const [activeTab, setActiveTab] = useState<'waiting' | 'content'>('waiting');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [highlightEnabled, setHighlightEnabled] = useState(true);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [remoteScrollEnabled, setRemoteScrollEnabled] = useState(true);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const { onScroll: onAdminLyricsScroll } = useScrollPositionPublisher({
    enabled: !!canManage && remoteScrollEnabled,
    publish: (ratio) => updateSession({ scroll_position: ratio } as any),
  });

  const handleLyricsScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    // In modalità evidenziazione usiamo highlight_line; in modalità "foglio" (highlight OFF) pubblichiamo lo scroll.
    if (highlightEnabled) return;
    onAdminLyricsScroll(e.currentTarget);
  }, [highlightEnabled, onAdminLyricsScroll]);
 
   const tvSettings = useMemo(() => ({
     title: (session as any)?.tv_title || 'Open Mic',
     subtitle: (session as any)?.tv_subtitle || 'NonceDuo Live Experience',
     footer: (session as any)?.tv_footer || 'Powered by NonceDuo',
     logoUrl: (session as any)?.tv_logo_url || '',
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
   const lines = useMemo(() => currentSong?.testo?.split('\n').filter(line => line.trim()) || [], [currentSong?.testo]);
 
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
 
   // Auto-switch to content when broadcasting
   useEffect(() => {
     if (isBroadcasting && currentSong) setActiveTab('content');
   }, [isBroadcasting, currentSong]);
 
    // Sync viewMode from session
    useEffect(() => {
      const sessionViewMode = (session as any)?.tv_view_mode;
      if (sessionViewMode && ['compact', 'karaoke', 'spotify'].includes(sessionViewMode)) {
        setViewMode(sessionViewMode as ViewMode);
      }
    }, [(session as any)?.tv_view_mode]);

  // Sync highlightEnabled from session
  useEffect(() => {
    const sessionHighlight = (session as any)?.highlight_enabled;
    if (sessionHighlight !== undefined) {
      setHighlightEnabled(sessionHighlight);
    }
  }, [(session as any)?.highlight_enabled]);

  // Sync fontSize from session
  useEffect(() => {
    const sessionFontSize = (session as any)?.font_size;
    if (sessionFontSize !== undefined && sessionFontSize !== null) {
      setFontSize(sessionFontSize);
    }
  }, [(session as any)?.font_size]);

  // Sync textAlign from session
  useEffect(() => {
    const sessionTextAlign = (session as any)?.text_align;
    if (sessionTextAlign && ['left', 'center', 'right'].includes(sessionTextAlign)) {
      setTextAlign(sessionTextAlign);
    }
  }, [(session as any)?.text_align]);

  // Sync remoteScrollEnabled from session
  useEffect(() => {
    const sessionRemoteScroll = (session as any)?.remote_scroll_enabled;
    if (sessionRemoteScroll !== undefined) {
      setRemoteScrollEnabled(sessionRemoteScroll);
    }
  }, [(session as any)?.remote_scroll_enabled]);
 
   // Fetch current song
   useEffect(() => {
     const fetchSong = async () => {
       if (!session?.current_song_id) { setCurrentSong(null); setLocalHighlightLine(0); return; }
       const { data } = await supabase.from('songs').select('id, titolo, artista, testo').eq('id', session.current_song_id).single();
       if (data) { setCurrentSong(data); setLocalHighlightLine(session.highlight_line || 0); }
     };
     fetchSong();
   }, [session?.current_song_id, session?.highlight_line]);
 
   // Sync highlight line
   useEffect(() => {
     if (session?.highlight_line !== undefined) setLocalHighlightLine(session.highlight_line);
   }, [session?.highlight_line]);
 
   // Auto-scroll
   useEffect(() => {
     if (!autoScroll || !lines.length) return;
     const interval = setInterval(async () => {
       setLocalHighlightLine(prev => {
         const next = prev >= lines.length - 1 ? prev : prev + 1;
         updateSession({ highlight_line: next, auto_scroll: true } as any);
         return next;
       });
     }, (6 - scrollSpeed) * 1500);
     return () => clearInterval(interval);
   }, [autoScroll, lines.length, scrollSpeed, updateSession]);
 
  // Scroll within container only (no page scroll)
  useEffect(() => {
    if (!highlightEnabled) return;

    if (lyricsRef.current && lines.length > 0) {
      const container = lyricsRef.current;
      const lineElement = container.querySelector(`[data-line="${localHighlightLine}"]`) as HTMLElement;
      if (lineElement) {
        // Calculate scroll to center the highlighted line in the container
        const containerHeight = container.clientHeight;
        const lineTop = lineElement.offsetTop;
        const lineHeight = lineElement.offsetHeight;
        const scrollTarget = lineTop - (containerHeight / 2) + (lineHeight / 2);
        container.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' });
      }
    }
  }, [localHighlightLine, lines.length, highlightEnabled]);
 
   const handleLineChange = useCallback(async (direction: 'up' | 'down') => {
     if (!canManage) return;
     const newLine = direction === 'up' ? Math.max(0, localHighlightLine - 1) : Math.min(lines.length - 1, localHighlightLine + 1);
     setLocalHighlightLine(newLine);
     setAutoScroll(false);
     await updateSession({ highlight_line: newLine, auto_scroll: false } as any);
   }, [canManage, localHighlightLine, lines.length, updateSession]);
 
   const handleLineClick = useCallback(async (index: number) => {
     if (!canManage) return;
     setLocalHighlightLine(index);
     setAutoScroll(false);
     await updateSession({ highlight_line: index, auto_scroll: false } as any);
   }, [canManage, updateSession]);
 
   const handleReset = useCallback(async () => {
     if (!canManage) return;
     setLocalHighlightLine(0);
     setAutoScroll(false);
     await updateSession({ highlight_line: 0, auto_scroll: false } as any);
   }, [canManage, updateSession]);
 
   const handleStopBroadcast = useCallback(async () => {
     if (!canManage) return;
     await updateSession({ is_broadcasting: false, display_mode: 'waiting', current_song_id: null, current_reservation_id: null, highlight_line: 0, auto_scroll: false } as any);
     setAutoScroll(false);
     toast.success('Trasmissione interrotta - TV in attesa');
   }, [canManage, updateSession]);
 
   const handleStartBroadcast = useCallback(async () => {
     if (!canManage || !currentSong) return;
     await updateSession({ is_broadcasting: true, display_mode: 'lyrics', tv_view_mode: viewMode } as any);
     toast.success(`Trasmissione avviata! Stile: ${viewMode === 'spotify' ? 'Spotify' : viewMode === 'karaoke' ? 'Karaoke' : 'Compatta'}`);
   }, [canManage, currentSong, viewMode, updateSession]);
 
   const handleToggleAutoScroll = useCallback(async () => {
     const newAutoScroll = !autoScroll;
     setAutoScroll(newAutoScroll);
     await updateSession({ auto_scroll: newAutoScroll } as any);
     if (newAutoScroll) toast.success('Auto-scroll attivato');
   }, [autoScroll, updateSession]);
 
  const handleViewModeChange = useCallback(async (mode: ViewMode) => {
    setViewMode(mode);
    await updateSession({ tv_view_mode: mode } as any);
  }, [updateSession]);

  const handleToggleHighlight = useCallback(async () => {
    const newValue = !highlightEnabled;
    setHighlightEnabled(newValue);
    await updateSession({ highlight_enabled: newValue } as any);
    toast.success(newValue ? 'Evidenziazione attivata' : 'Evidenziazione disattivata');
  }, [highlightEnabled, updateSession]);

  // Font size change synced to DB
  const handleFontSizeChange = useCallback(async (delta: number) => {
    const newSize = Math.max(50, Math.min(150, fontSize + delta));
    setFontSize(newSize);
    await updateSession({ font_size: newSize } as any);
  }, [fontSize, updateSession]);

  // Text align change synced to DB
  const handleTextAlignChange = useCallback(async (align: 'left' | 'center' | 'right') => {
    setTextAlign(align);
    await updateSession({ text_align: align } as any);
  }, [updateSession]);

  // Remote scroll toggle synced to DB
  const handleToggleRemoteScroll = useCallback(async (enabled: boolean) => {
    setRemoteScrollEnabled(enabled);
    await updateSession({ remote_scroll_enabled: enabled } as any);
    toast.success(enabled ? 'Scroll da telecomando abilitato' : 'Scroll da telecomando disabilitato');
  }, [updateSession]);
 
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
 
   // Lyrics preview
   const renderLyricsPreview = () => {
     if (!currentSong) return null;
     const containerHeight = isExpanded ? (isMobile ? '50vh' : '60vh') : (isMobile ? '35vh' : '40vh');
     const lyricsHeight = isExpanded ? (isMobile ? 'calc(50vh - 140px)' : 'calc(60vh - 160px)') : (isMobile ? 'calc(35vh - 120px)' : 'calc(40vh - 140px)');
     
     return (
       <div className={cn("relative rounded-xl overflow-hidden", viewMode === 'spotify' ? `bg-gradient-to-b ${getColorForSong(currentSong.id)}` : viewMode === 'karaoke' ? "bg-gradient-to-b from-gray-900 via-black to-gray-900" : "bg-card border")} style={{ minHeight: containerHeight }}>
         {viewMode === 'karaoke' && (
           <div className="absolute inset-0 pointer-events-none">
             <div className="absolute top-0 left-1/4 w-[150px] h-[150px] bg-primary/15 rounded-full blur-[80px]" />
             <div className="absolute bottom-0 right-1/4 w-[100px] h-[100px] bg-purple-600/10 rounded-full blur-[60px]" />
           </div>
         )}
         <div className="relative z-10 px-3 pt-3 pb-2">
           <div className="flex items-center justify-between gap-2">
             <div className="min-w-0 flex-1">
               <h2 className={cn("font-bold truncate text-base md:text-lg", viewMode === 'compact' ? "text-foreground" : "text-white")} style={{ fontSize: `${Math.max(14, 16 * fontSize / 100)}px` }}>{currentSong.titolo}</h2>
               <p className={cn("truncate text-sm", viewMode === 'compact' ? "text-muted-foreground" : "text-white/60")} style={{ fontSize: `${Math.max(12, 14 * fontSize / 100)}px` }}>{currentSong.artista}</p>
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
               <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 space-y-2 text-center">
                 {lines.map((line, index) => {
                   const isHighlighted = localHighlightLine === index;
                   const isPast = index < localHighlightLine;
                   const distance = Math.abs(index - localHighlightLine);
                   // When highlight is OFF, show all lines fully visible
                   const opacity = highlightEnabled 
                     ? (isHighlighted ? 1 : isPast ? 0.35 : distance === 1 ? 0.85 : distance === 2 ? 0.65 : 0.45)
                     : 1;
                   return (
                     <p key={index} data-line={index} onClick={() => handleLineClick(index)} className={cn(
                       "font-sans leading-loose transition-all duration-300 cursor-pointer py-2 px-4 -mx-1 rounded-lg text-white",
                       highlightEnabled && isHighlighted && "bg-yellow-400/40 ring-2 ring-yellow-400/60 font-bold shadow-lg scale-[1.02]", 
                       !isHighlighted && "hover:bg-white/10"
                     )} style={{ fontSize: `${Math.max(14, 16 * fontSize / 100)}px`, opacity }}>{line || '\u00A0'}</p>
                   );
                 })}
               </div>
             ) : viewMode === 'karaoke' ? (
               <div className="text-center space-y-2 py-4">
                 {lines.map((line, index) => {
                   const isHighlighted = localHighlightLine === index;
                   const isPast = index < localHighlightLine;
                   const dist = Math.abs(index - localHighlightLine);
                   // When highlight is OFF, show all lines fully visible
                   const opacity = highlightEnabled 
                     ? (isHighlighted ? 1 : isPast ? 0.3 : dist === 1 ? 0.8 : dist === 2 ? 0.6 : dist === 3 ? 0.45 : 0.3)
                     : 1;
                   const baseFontSize = Math.max(14, 16 * fontSize / 100);
                   return (
                     <p key={index} data-line={index} onClick={() => handleLineClick(index)} className={cn(
                       "font-bold transition-all duration-500 cursor-pointer text-white py-2",
                       highlightEnabled && isHighlighted && "text-primary scale-110 bg-primary/20 rounded-lg px-4 shadow-lg"
                     )} style={{ 
                       fontSize: (highlightEnabled && isHighlighted) ? `${baseFontSize * 1.4}px` : `${baseFontSize}px`, 
                       opacity, 
                       textShadow: (highlightEnabled && isHighlighted) ? '0 0 40px hsl(var(--primary) / 0.6)' : 'none' 
                     }}>{line || '\u00A0'}</p>
                   );
                 })}
               </div>
             ) : (
               /* COMPACT MODE - No line numbers, centered, larger font, continuous text */
               <div className="text-center space-y-1 py-4">
                 {lines.map((line, index) => {
                   const isHighlighted = localHighlightLine === index;
                   // When highlight is OFF, show all lines fully visible as continuous text
                   const opacity = highlightEnabled 
                     ? (isHighlighted ? 1 : 0.5)
                     : 1;
                   return (
                     <p key={index} data-line={index} onClick={() => handleLineClick(index)} className={cn(
                       "transition-all duration-300 cursor-pointer px-4 py-2 rounded-lg leading-relaxed",
                       highlightEnabled && isHighlighted && "bg-primary text-primary-foreground font-bold shadow-md ring-2 ring-primary/50", 
                       !isHighlighted && "hover:bg-muted"
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
              {currentSong ? (
                <>
                   {/* Style selector + Highlight toggle + Remote scroll toggle */}
                   <div className="flex flex-wrap items-center gap-3">
                     <div className="flex flex-wrap items-center gap-2">
                       <Label className="text-xs text-muted-foreground">Stile:</Label>
                       {(['compact', 'karaoke', 'spotify'] as ViewMode[]).map((mode) => (
                         <Button key={mode} variant={viewMode === mode ? 'default' : 'outline'} size="sm" onClick={() => handleViewModeChange(mode)} className="h-8 text-xs capitalize">{mode === 'compact' ? 'Compatta' : mode === 'karaoke' ? 'Karaoke' : 'Spotify'}</Button>
                       ))}
                     </div>
                     {/* HIGHLIGHT TOGGLE - Always visible, critical for live use */}
                     <Button
                       variant={highlightEnabled ? 'default' : 'outline'}
                       size="sm"
                       onClick={handleToggleHighlight}
                       disabled={!canManage}
                       className={cn(
                         "h-10 min-w-[130px] font-medium transition-all",
                         highlightEnabled 
                           ? "bg-yellow-500 hover:bg-yellow-600 text-yellow-950" 
                           : "border-dashed"
                       )}
                     >
                       <Highlighter className="w-4 h-4 mr-2" />
                       Evidenziazione {highlightEnabled ? 'ON' : 'OFF'}
                     </Button>
                   </div>
                 {renderLyricsPreview()}
                 {/* Controls */}
                 <div className="p-3 bg-muted/50 rounded-xl">
                   <div className="flex flex-wrap items-center justify-center gap-2">
                     {isBroadcasting ? (
                       <Button variant="destructive" size="sm" onClick={handleStopBroadcast} disabled={!canManage} className="h-10"><Square className="w-4 h-4 mr-1" />Ferma</Button>
                     ) : (
                       <Button size="sm" onClick={handleStartBroadcast} disabled={!canManage} className="h-10 bg-green-600 hover:bg-green-700"><Radio className="w-4 h-4 mr-1" />Avvia</Button>
                     )}
                     <div className="flex items-center gap-1 bg-background rounded-lg p-1">
                       <Button variant="ghost" size="icon" onClick={() => handleLineChange('up')} disabled={!canManage || localHighlightLine === 0} className="h-9 w-9"><ChevronUp className="w-5 h-5" /></Button>
                       <span className="px-2 min-w-[50px] text-center font-medium text-sm">{localHighlightLine + 1}/{lines.length}</span>
                       <Button variant="ghost" size="icon" onClick={() => handleLineChange('down')} disabled={!canManage || localHighlightLine >= lines.length - 1} className="h-9 w-9"><ChevronDown className="w-5 h-5" /></Button>
                     </div>
                    <Button variant={autoScroll ? "destructive" : "outline"} size="icon" onClick={handleToggleAutoScroll} disabled={!canManage} className="h-9 w-9">{autoScroll ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</Button>
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
                 <p className="text-base font-medium mb-2">Nessuna canzone selezionata</p>
                 <p className="text-sm">Seleziona dalla Scaletta Live o dal Catalogo.</p>
               </div>
             )}
           </TabsContent>
         </Tabs>
       </CardContent>
     </Card>
   );
 }