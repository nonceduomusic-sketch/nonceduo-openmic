import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getCachedSongById } from '@/lib/songsCatalogCache';
import { Mic, Mic2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { scrollElementToRatio } from '@/lib/scrollRatio';
import brandLogoText from '@/assets/brand-logo-text.png';
import { parseChordPro, transposeSong, ChordProSong } from '@/lib/chordpro';
import { renderResponsiveChordLine } from '@/lib/chordproRenderer';
import { resolveStandbyMode, STANDBY_DEFAULTS } from '@/lib/tvStandbyModes';
import QRCode from 'qrcode';
import { STANDBY_QR_URLS } from '@/lib/tvStandbyModes';

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

const getColorForSong = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return BACKGROUND_COLORS[Math.abs(hash) % BACKGROUND_COLORS.length];
};

type LyricsViewMode = 'compact' | 'karaoke' | 'spotify' | 'chordpro';

/**
 * TV Page - Read-only viewer for broadcast lyrics.
 * Users access this from the banner on /app/openmic.
 * NO settings, NO controls — just lyrics + a "Prenota" button.
 */
export default function TV() {
  const salaCode = 'main';
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentSongbookFile, setCurrentSongbookFile] = useState<SongbookFile | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [pinToShow, setPinToShow] = useState<string | null>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);

  // Fetch broadcast session + subscribe to realtime
  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase
        .from('broadcast_sessions')
        .select('*')
        .eq('sala_code', salaCode)
        .maybeSingle();
      setSession(data);
      setLoading(false);
    };
    fetchSession();

    const channel = supabase
      .channel('tv-broadcast-sync')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'broadcast_sessions',
        filter: `sala_code=eq.${salaCode}`,
      }, (payload) => {
        setSession(payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Derived settings (read-only)
  const isSongbookMode = !((session as any)?.dual_broadcast ?? false) && ((session as any)?.songbook_mode ?? false);
  const songbookFileId = (session as any)?.songbook_file_id ?? null;
  const songbookShowChords = (session as any)?.songbook_show_chords_on_tv ?? false;
  const songbookTranspose = (session as any)?.songbook_transpose ?? 0;
  const songbookViewMode = ((session as any)?.songbook_view_mode as string) || 'chordpro';
  const isDualBroadcast = (session as any)?.dual_broadcast ?? false;
  const isBroadcasting = (session as any)?.is_broadcasting ?? false;
  const highlightEnabled = isDualBroadcast ? false : ((session as any)?.highlight_enabled ?? true);
  const highlightLinesCount = (session as any)?.highlight_lines_count ?? 1;
  const highlightStyle: 'gradient' | 'uniform' | 'uniform-gradient' = (session as any)?.highlight_style ?? 'gradient';
  const highlightLine = (session as any)?.highlight_line ?? 0;

  const viewMode: LyricsViewMode = isSongbookMode
    ? (songbookViewMode as LyricsViewMode) || 'chordpro'
    : (((session as any)?.tv_view_mode as LyricsViewMode) || 'karaoke');

  const tvSettings = useMemo(() => ({
    title: (session as any)?.tv_title ?? 'Open Mic',
    subtitle: (session as any)?.tv_subtitle ?? 'NonceDuo Live Experience',
    footer: (session as any)?.tv_footer ?? 'Powered by NonceDuo',
    logoUrl: (session as any)?.tv_logo_url ?? '',
    qrCta: (session as any)?.tv_qr_cta || 'Scansiona per prenotare la tua canzone',
    showLogo: (session as any)?.tv_show_logo ?? true,
    showTitle: (session as any)?.tv_show_title ?? true,
    showSubtitle: (session as any)?.tv_show_subtitle ?? true,
    showFooter: (session as any)?.tv_show_footer ?? true,
    showStatus: (session as any)?.tv_show_status ?? true,
    showQr: (session as any)?.tv_show_qr ?? true,
    fontSize: (session as any)?.font_size ?? 100,
    textAlign: ((session as any)?.text_align as 'left' | 'center' | 'right') || 'center',
  }), [session]);

  const lines = useMemo(() =>
    currentSong?.testo?.split('\n').filter(line => line.trim()) || []
  , [currentSong?.testo]);

  const parsedSongbook: ChordProSong | null = useMemo(() => {
    if (!currentSongbookFile) return null;
    const parsed = parseChordPro(currentSongbookFile.content);
    return transposeSong(parsed, songbookTranspose);
  }, [currentSongbookFile, songbookTranspose]);

  // Fetch current song
  useEffect(() => {
    const fetchSong = async () => {
      if (!session?.current_song_id) { setCurrentSong(null); return; }
      const { data } = await supabase
        .from('songs')
        .select('id, titolo, artista, testo')
        .eq('id', session.current_song_id)
        .single();
      if (data) setCurrentSong(data);
      else {
        const cached = await getCachedSongById(session.current_song_id);
        if (cached) setCurrentSong({ id: cached.id, titolo: cached.titolo, artista: cached.artista, testo: cached.testo });
      }
    };
    fetchSong();
  }, [session?.current_song_id]);

  // Fetch songbook file
  useEffect(() => {
    const fetch = async () => {
      if (!isSongbookMode || !songbookFileId) { setCurrentSongbookFile(null); return; }
      const { data } = await supabase
        .from('songbook_files')
        .select('id, title, artist, content')
        .eq('id', songbookFileId)
        .single();
      if (data) setCurrentSongbookFile(data);
    };
    fetch();
  }, [isSongbookMode, songbookFileId]);

  // Scroll highlight into view
  const scrollAnimFrameRef = useRef<number | null>(null);
  useEffect(() => {
    if (!lyricsRef.current || !isBroadcasting || isDualBroadcast) return;
    const shouldFollow = isSongbookMode || (highlightEnabled && lines.length > 0);
    if (!shouldFollow) return;

    const container = lyricsRef.current;
    const firstEl = container.querySelector(`[data-line="${highlightLine}"]`) as HTMLElement;
    if (!firstEl) return;

    const lastEl = container.querySelector(`[data-line="${highlightLine + highlightLinesCount - 1}"]`) as HTMLElement;
    const groupTop = firstEl.offsetTop;
    const groupBottom = lastEl ? lastEl.offsetTop + lastEl.offsetHeight : firstEl.offsetTop + firstEl.offsetHeight;
    const groupCenter = (groupTop + groupBottom) / 2;
    const target = Math.max(0, groupCenter - container.clientHeight / 2);

    if (scrollAnimFrameRef.current) cancelAnimationFrame(scrollAnimFrameRef.current);
    const startPos = container.scrollTop;
    const distance = target - startPos;
    if (Math.abs(distance) < 2) { container.scrollTop = target; return; }
    const duration = Math.min(120, Math.abs(distance) * 0.5);
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      container.scrollTop = startPos + distance * eased;
      if (progress < 1) scrollAnimFrameRef.current = requestAnimationFrame(animate);
    };
    scrollAnimFrameRef.current = requestAnimationFrame(animate);

    return () => { if (scrollAnimFrameRef.current) cancelAnimationFrame(scrollAnimFrameRef.current); };
  }, [highlightLine, highlightLinesCount, lines.length, highlightEnabled, isSongbookMode, isBroadcasting, isDualBroadcast]);

  // Follow scroll_position for dual broadcast / highlight off
  useEffect(() => {
    if (!lyricsRef.current || !isBroadcasting) return;
    if (session?.display_mode !== 'lyrics' || (!currentSong && !(isSongbookMode && parsedSongbook))) return;
    if (isSongbookMode) return;
    if (!isDualBroadcast && highlightEnabled) return;
    const scrollPosition = (session as any)?.scroll_position ?? 0;
    scrollElementToRatio(lyricsRef.current, scrollPosition);
  }, [(session as any)?.scroll_position, highlightEnabled, isBroadcasting, session?.display_mode, currentSong?.id, isSongbookMode, isDualBroadcast]);

  // Auto-scroll
  const autoScrollActive = (session as any)?.auto_scroll_active ?? false;
  const autoScrollBpm = (session as any)?.auto_scroll_bpm ?? 60;
  const autoScrollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!lyricsRef.current || !isBroadcasting || !autoScrollActive) {
      if (autoScrollRef.current) { cancelAnimationFrame(autoScrollRef.current); autoScrollRef.current = null; }
      return;
    }
    const pixelsPerSecond = (autoScrollBpm / 60) * 30;
    let lastTime = performance.now();
    let accumulator = 0;

    const scroll = (currentTime: number) => {
      if (!lyricsRef.current) return;
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      accumulator += (pixelsPerSecond * deltaTime) / 1000;
      if (accumulator >= 1) {
        const px = Math.floor(accumulator);
        accumulator -= px;
        lyricsRef.current.scrollTop += px;
        if (lyricsRef.current.scrollTop >= lyricsRef.current.scrollHeight - lyricsRef.current.clientHeight) return;
      }
      autoScrollRef.current = requestAnimationFrame(scroll);
    };
    autoScrollRef.current = requestAnimationFrame(scroll);
    return () => { if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current); };
  }, [autoScrollActive, autoScrollBpm, isBroadcasting]);

  // QR code for standby
  const currentStandbyMode = resolveStandbyMode((session as any)?.tv_standby_mode);
  const modeQrUrl = STANDBY_QR_URLS[currentStandbyMode];

  useEffect(() => {
    const generateQR = async () => {
      try {
        const qrDest = modeQrUrl || 'https://nonceduo.com/app/openmic';
        const fullUrl = qrDest.startsWith('http') ? qrDest : `https://nonceduo.com${qrDest.startsWith('/') ? '' : '/'}${qrDest}`;
        const dataUrl = await QRCode.toDataURL(fullUrl, { width: 280, margin: 2, color: { dark: '#000000', light: '#ffffff' }, errorCorrectionLevel: 'M' });
        setQrCodeDataUrl(dataUrl);
      } catch {}
    };
    generateQR();
  }, [modeQrUrl]);

  // Fetch show_pin_on_gate setting
  useEffect(() => {
    const fetchPinSetting = async () => {
      // Try live event first
      const { data: liveData } = await supabase
        .from('event_booking_rules')
        .select('pin_required, pin_code, show_pin_on_gate')
        .eq('event_status', 'live')
        .maybeSingle();
      
      if (liveData && (liveData as any).pin_required && (liveData as any).show_pin_on_gate) {
        setPinToShow((liveData as any).pin_code);
        return;
      }

      // Try free mode
      const { data: freeData } = await supabase
        .from('free_mode_settings')
        .select('pin_enabled, pin_code, show_pin_on_gate')
        .eq('is_active', true)
        .maybeSingle();
      
      if (freeData && (freeData as any).pin_enabled && (freeData as any).show_pin_on_gate) {
        setPinToShow((freeData as any).pin_code);
        return;
      }

      setPinToShow(null);
    };
    fetchPinSetting();

    // Subscribe to changes
    const channel = supabase
      .channel('tv-pin-display')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_booking_rules' }, () => fetchPinSetting())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'free_mode_settings' }, () => fetchPinSetting())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- "Prenota" floating button (always visible) ---
  const PrenotaButton = () => (
    <div className="fixed bottom-6 right-6 z-50">
      <Link to="/app/openmic">
        <Button
          variant="outline"
          size="lg"
          className="border-white/20 text-white hover:bg-white/10 backdrop-blur-sm bg-black/30"
        >
          <Mic2 className="w-5 h-5 mr-2" />
          Prenota
        </Button>
      </Link>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-white/50">Caricamento...</div>
      </div>
    );
  }

  // === SONGBOOK MODE ===
  if (isBroadcasting && isSongbookMode && parsedSongbook) {
    const backgroundColor = getColorForSong(currentSongbookFile?.id || 'default');
    return (
      <div className={cn(
        'h-screen relative overflow-hidden flex flex-col',
        viewMode === 'chordpro' ? 'bg-slate-900 text-white' :
        viewMode === 'spotify' ? cn('text-white bg-gradient-to-b', backgroundColor) :
        viewMode === 'karaoke' ? 'bg-black text-white' :
        'bg-background text-foreground'
      )}>
        {viewMode === 'karaoke' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-black to-gray-900/50" />
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[200px]" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[200px]" />
          </div>
        )}
        <div className={cn("relative z-10 px-6 md:px-8 pt-6 md:pt-8 pb-4", viewMode === 'compact' && 'border-b')}>
          <div className="flex items-center gap-4 md:gap-6 min-w-0 max-w-5xl mx-auto">
            {tvSettings.showLogo && (
              <img src={tvSettings.logoUrl || brandLogoText} alt="Logo" className={cn("w-auto object-contain flex-shrink-0", viewMode === 'karaoke' ? 'h-10 md:h-16 opacity-80' : 'h-10 md:h-14 opacity-90')} onError={(e) => { (e.target as HTMLImageElement).src = brandLogoText; }} />
            )}
            <div className="min-w-0">
              <h1 className={cn("font-bold tracking-tight truncate", viewMode === 'karaoke' ? 'text-2xl sm:text-3xl md:text-5xl lg:text-6xl' : 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl')}>
                {parsedSongbook.title || currentSongbookFile?.title}
              </h1>
              <p className={cn("mt-1 font-medium truncate", viewMode === 'karaoke' ? 'text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/60 font-light' : 'text-lg sm:text-xl md:text-2xl text-white/80')}>
                {parsedSongbook.artist || currentSongbookFile?.artist}
              </p>
            </div>
          </div>
        </div>

        <div ref={lyricsRef} className="relative z-10 flex-1 min-h-0 px-6 md:px-12 lg:px-16 py-6 overflow-y-auto">
          <div className={cn("max-w-5xl mx-auto space-y-1", viewMode === 'spotify' && 'bg-black/30 backdrop-blur-sm rounded-2xl p-8 md:p-12 shadow-2xl', tvSettings.textAlign === 'left' && 'text-left', tvSettings.textAlign === 'center' && 'text-center', tvSettings.textAlign === 'right' && 'text-right')} style={{ overflowWrap: 'break-word', wordBreak: 'keep-all' }}>
            {parsedSongbook.lines.map((line, index) => {
              const isMainHighlight = highlightLine === index;
              const distanceFromMain = index - highlightLine;
              const isInHighlightRange = distanceFromMain >= 0 && distanceFromMain < highlightLinesCount;
              const isPast = index < highlightLine;
              let opacity = 1;
              if (highlightEnabled) {
                if (isInHighlightRange) opacity = highlightStyle === 'gradient' ? (isMainHighlight ? 1 : 0.95 - (distanceFromMain * 0.05)) : 1;
                else if (isPast) opacity = 0.55;
                else opacity = 0.75;
              }
              const baseFontSize = Math.max(16, 28 * tvSettings.fontSize / 100);

              if (line.type === 'directive' || line.type === 'comment') {
                if (line.directiveKey && ['chorus', 'verse', 'bridge', 'intro', 'outro', 'tab'].includes(line.directiveKey)) {
                  return (<div key={index} data-line={index} className="py-2 mt-4" style={{ opacity }}><span className="inline-block px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium uppercase tracking-wider">{line.directiveValue || line.directiveKey}</span></div>);
                }
                return null;
              }
              if (line.type === 'empty') return <div key={index} data-line={index} className="h-4" />;
              if (line.type === 'chord-text' && line.chords && songbookShowChords) {
                return (<div key={index} data-line={index} className={cn("transition-opacity duration-150 py-2 px-4 -mx-2 rounded-lg", highlightEnabled && (highlightStyle !== 'gradient' ? isInHighlightRange : isMainHighlight) && "bg-primary/20 ring-2 ring-primary/40 scale-[1.01]", highlightEnabled && (highlightStyle === 'gradient' && isInHighlightRange && !isMainHighlight) && "bg-primary/10")} style={{ opacity, fontSize: `${baseFontSize}px` }}>{renderResponsiveChordLine(line, { coloredChords: true, chordClassName: 'text-primary' })}</div>);
              }
              return (<div key={index} data-line={index} className={cn("transition-opacity duration-150 py-2 px-4 -mx-2 rounded-lg leading-relaxed", highlightEnabled && (highlightStyle !== 'gradient' ? isInHighlightRange : isMainHighlight) && "bg-primary/20 ring-2 ring-primary/40 scale-[1.01] font-semibold", highlightEnabled && (highlightStyle === 'gradient' && isInHighlightRange && !isMainHighlight) && "bg-primary/10")} style={{ opacity, fontSize: `${baseFontSize}px` }}>{line.text || '\u00A0'}</div>);
            })}
          </div>
        </div>
        <PrenotaButton />
      </div>
    );
  }

  // === LYRICS MODE ===
  if (isBroadcasting && session?.display_mode === 'lyrics' && currentSong) {
    const backgroundColor = getColorForSong(currentSong.id);

    const renderLines = (mode: 'karaoke' | 'spotify' | 'compact') => {
      const baseMult = mode === 'karaoke' ? 32 : mode === 'spotify' ? 24 : 24;
      const minSize = mode === 'karaoke' ? 18 : 14;
      return lines.map((line, index) => {
        const isMainHighlight = highlightLine === index;
        const distanceFromMain = index - highlightLine;
        const isInHighlightRange = distanceFromMain >= 0 && distanceFromMain < highlightLinesCount;
        const isPast = index < highlightLine;
        const distanceFromHighlight = Math.abs(index - highlightLine);
        let opacity = 1;
        if (highlightEnabled) {
          if (isInHighlightRange) {
            opacity = highlightStyle === 'gradient' ? (isMainHighlight ? 1 : (mode === 'karaoke' ? 0.95 - distanceFromMain * 0.03 : 0.92 - distanceFromMain * 0.05)) : 1;
          } else if (isPast) opacity = mode === 'karaoke' ? 0.5 : 0.55;
          else if (mode === 'karaoke' && distanceFromHighlight === highlightLinesCount) opacity = 0.85;
          else if (mode === 'karaoke' && distanceFromHighlight === highlightLinesCount + 1) opacity = 0.7;
          else opacity = mode === 'karaoke' ? 0.55 : 0.8;
        }
        const baseFontSize = Math.max(minSize, baseMult * tvSettings.fontSize / 100);

        if (mode === 'karaoke') {
          const isUniform = highlightStyle === 'uniform';
          const isRisalto = highlightStyle === 'uniform-gradient';
          const isGradient = highlightStyle === 'gradient';
          let lineFontSize = baseFontSize;
          if (highlightEnabled && isInHighlightRange) {
            if (isGradient) lineFontSize = isMainHighlight ? baseFontSize * 1.4 : baseFontSize * (1.25 - distanceFromMain * 0.03);
            else if (isRisalto) lineFontSize = baseFontSize * 1.3;
          }
          const showPrimaryColor = highlightEnabled && isInHighlightRange && (isGradient ? isMainHighlight : true);
          const showSecondaryColor = highlightEnabled && isInHighlightRange && isGradient && !isMainHighlight;
          return (
            <p key={index} data-line={index} className={cn("font-bold leading-relaxed transition-[color,opacity,text-shadow] duration-500 ease-out font-sans tracking-wide", showPrimaryColor && "text-primary", showSecondaryColor && "text-primary/80")} style={{ opacity, fontSize: `${lineFontSize}px`, textShadow: (highlightEnabled && isInHighlightRange) ? (isMainHighlight && isGradient ? '0 0 40px hsl(var(--primary) / 0.4), 0 0 80px hsl(var(--primary) / 0.2)' : '0 0 30px hsl(var(--primary) / 0.3)') : 'none' }}>
              {line || '\u00A0'}
            </p>
          );
        }

        if (mode === 'spotify') {
          return (
            <p key={index} data-line={index} className={cn("font-sans leading-loose transition-opacity duration-150 py-3 px-6 -mx-4 rounded-xl", highlightEnabled && (highlightStyle !== 'gradient' ? isInHighlightRange : isMainHighlight) && "bg-yellow-400/30 ring-2 ring-yellow-400/50 scale-[1.02] font-bold", highlightEnabled && (highlightStyle === 'gradient' && isInHighlightRange && !isMainHighlight) && "bg-yellow-400/15 ring-1 ring-yellow-400/30")} style={{ opacity, fontSize: `${baseFontSize}px` }}>
              {line || '\u00A0'}
            </p>
          );
        }

        // compact
        return (
          <p key={index} data-line={index} className={cn("leading-relaxed transition-opacity duration-150 px-6 py-3 rounded-xl", highlightEnabled && (highlightStyle !== 'gradient' ? isInHighlightRange : isMainHighlight) && "bg-primary/20 text-primary font-bold ring-2 ring-primary/30", highlightEnabled && (highlightStyle === 'gradient' && isInHighlightRange && !isMainHighlight) && "bg-primary/10 text-primary/80 ring-1 ring-primary/20")} style={{ opacity, fontSize: `${baseFontSize}px` }}>
            {line || '\u00A0'}
          </p>
        );
      });
    };

    if (viewMode === 'spotify') {
      return (
        <div className={cn('h-screen text-white relative overflow-hidden flex flex-col bg-gradient-to-b', backgroundColor)}>
          <div className="relative z-10 px-6 md:px-8 pt-6 md:pt-8 pb-4">
            <div className="flex items-center gap-4 md:gap-6 min-w-0 max-w-4xl mx-auto">
              {tvSettings.showLogo && <img src={tvSettings.logoUrl || brandLogoText} alt="Logo" className="h-10 md:h-14 w-auto object-contain opacity-90 flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = brandLogoText; }} />}
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white truncate">{currentSong.titolo}</h1>
                <p className="text-lg sm:text-xl md:text-2xl text-white/80 mt-1 font-medium truncate">{currentSong.artista}</p>
              </div>
            </div>
          </div>
          <div ref={lyricsRef} className="relative z-10 flex-1 min-h-0 px-4 md:px-8 py-4 overflow-y-auto">
            <div className={cn("max-w-4xl mx-auto bg-black/30 backdrop-blur-sm rounded-2xl p-8 md:p-12 shadow-2xl space-y-4 md:space-y-6", tvSettings.textAlign === 'left' && 'text-left', tvSettings.textAlign === 'center' && 'text-center', tvSettings.textAlign === 'right' && 'text-right')} style={{ overflowWrap: 'break-word', wordBreak: 'keep-all' }}>
              {renderLines('spotify')}
            </div>
          </div>
          <PrenotaButton />
        </div>
      );
    }

    if (viewMode === 'karaoke') {
      return (
        <div className="h-screen bg-black text-white relative overflow-hidden flex flex-col">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-black to-gray-900/50" />
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[200px]" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[200px]" />
          </div>
          <div className="relative z-10 px-6 md:px-8 pt-6 md:pt-8 pb-4">
            <div className="flex items-center gap-4 md:gap-6 min-w-0 max-w-6xl mx-auto">
              {tvSettings.showLogo && <img src={tvSettings.logoUrl || brandLogoText} alt="Logo" className="h-10 md:h-16 w-auto object-contain opacity-80 flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = brandLogoText; }} />}
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white truncate">{currentSong.titolo}</h1>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/60 mt-1 font-light truncate">{currentSong.artista}</p>
              </div>
            </div>
          </div>
          <div ref={lyricsRef} className="relative z-10 flex-1 min-h-0 px-8 md:px-16 lg:px-24 py-8 overflow-y-auto">
            <div className={cn("max-w-5xl mx-auto space-y-4 md:space-y-6 py-[10vh]", tvSettings.textAlign === 'left' && 'text-left', tvSettings.textAlign === 'center' && 'text-center', tvSettings.textAlign === 'right' && 'text-right')} style={{ overflowWrap: 'break-word', wordBreak: 'keep-all' }}>
              {renderLines('karaoke')}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
            <div className="flex items-center justify-center gap-2 text-white/30 text-sm"><Mic className="w-4 h-4" /><span>{tvSettings.title}</span></div>
          </div>
          <PrenotaButton />
        </div>
      );
    }

    // Compact mode
    return (
      <div className="h-screen bg-background text-foreground relative overflow-hidden flex flex-col">
        <div className="relative z-10 px-6 md:px-8 pt-6 md:pt-8 pb-4 border-b">
          <div className="flex items-center gap-4 md:gap-6 min-w-0 max-w-4xl mx-auto">
            {tvSettings.showLogo && <img src={tvSettings.logoUrl || brandLogoText} alt="Logo" className="h-10 md:h-12 w-auto object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = brandLogoText; }} />}
            <div className="min-w-0 text-center flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight truncate">{currentSong.titolo}</h1>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mt-1 truncate">{currentSong.artista}</p>
            </div>
          </div>
        </div>
        <div ref={lyricsRef} className="relative z-10 flex-1 min-h-0 px-6 md:px-8 py-8 overflow-y-auto">
          <div className={cn("max-w-4xl mx-auto space-y-4", tvSettings.textAlign === 'left' && 'text-left', tvSettings.textAlign === 'center' && 'text-center', tvSettings.textAlign === 'right' && 'text-right')} style={{ overflowWrap: 'break-word', wordBreak: 'keep-all' }}>
            {renderLines('compact')}
          </div>
        </div>
        <PrenotaButton />
      </div>
    );
  }

  // === STANDBY / WAITING MODE ===
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white relative overflow-hidden select-none">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[200px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/15 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      <div className="relative z-10 min-h-screen w-full flex flex-col items-center justify-evenly py-[5vh] px-8">
        {tvSettings.showLogo && (
          <img src={tvSettings.logoUrl || brandLogoText} alt="Logo" className="h-14 md:h-20 w-auto object-contain shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = brandLogoText; }} />
        )}
        {tvSettings.showTitle && (
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-center shrink-0">
            <span className="bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent">{tvSettings.title}</span>
          </h1>
        )}
        {tvSettings.showSubtitle && (
          <p className="text-lg md:text-2xl text-white/60 font-light text-center shrink-0">{tvSettings.subtitle}</p>
        )}
        {tvSettings.showStatus && (
          <div className="flex justify-center shrink-0">
            {session?.is_active ? (
              <div className="flex items-center gap-3 px-5 py-2.5 bg-green-500/20 border border-green-500/30 rounded-full">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-400 font-medium text-base md:text-lg">Evento in corso</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-5 py-2.5 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span className="text-yellow-400 font-medium text-base md:text-lg">In attesa...</span>
              </div>
            )}
          </div>
        )}
        {tvSettings.showQr && qrCodeDataUrl && (
          <div className="bg-white rounded-2xl p-3 md:p-4 shadow-2xl shrink-0">
            <img src={qrCodeDataUrl} alt="QR Code" className="w-28 h-28 md:w-40 md:h-40 lg:w-48 lg:h-48" />
          </div>
        )}
        {pinToShow && tvSettings.showQr && (
          <div className="flex items-center gap-3 px-6 py-2 bg-white/10 border border-white/20 rounded-full shrink-0">
            <span className="text-white/60 text-sm md:text-base font-medium">PIN:</span>
            <span className="text-white text-xl md:text-2xl font-mono font-bold tracking-[0.3em]">{pinToShow}</span>
          </div>
        )}
        {tvSettings.showQr && (
          <p className="text-base md:text-xl text-white/70 text-center shrink-0">{tvSettings.qrCta}</p>
        )}
        {tvSettings.showFooter && (
          <p className="text-white/30 text-sm text-center shrink-0">{tvSettings.footer}</p>
        )}
      </div>
      <PrenotaButton />
    </div>
  );
}
