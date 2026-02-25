import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useHybridBroadcast } from '@/hooks/useHybridBroadcast';
import { useScreenShareViewer } from '@/hooks/useScreenShare';
import { supabase } from '@/integrations/supabase/client';
import { getCachedSongById } from '@/lib/songsCatalogCache';
import { safeGetItem } from '@/lib/safeStorage';
import { ConnectionSettings } from '@/components/songbook/ConnectionSettings';
import { Maximize, Mic, Guitar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { scrollElementToRatio } from '@/lib/scrollRatio';
import QRCode from 'qrcode';
import brandLogoText from '@/assets/brand-logo-text.png';
import { ScreenShareViewer } from '@/components/broadcast/ScreenShareViewer';
import { parseChordPro, transposeSong, ChordProSong, ChordProLine } from '@/lib/chordpro';
import { renderResponsiveChordLine } from '@/lib/chordproRenderer';
import { usePedalScroll } from '@/hooks/usePedalControl';
import { TVGameOverlay } from '@/components/broadcast/TVGameOverlay';
import { TVFuroreOverlay } from '@/components/broadcast/TVFuroreOverlay';

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

interface ElementPosition {
  x: number;
  y: number;
}

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

const DEFAULT_POSITIONS: Record<string, ElementPosition> = {
  logo: { x: 50, y: 15 },
  title: { x: 50, y: 35 },
  subtitle: { x: 50, y: 42 },
  status: { x: 50, y: 52 },
  qr: { x: 50, y: 72 },
  qr_cta: { x: 50, y: 88 },
  footer: { x: 50, y: 96 },
};

type LyricsViewMode = 'compact' | 'karaoke' | 'spotify' | 'chordpro';

/**
 * Render chords above lyrics with proper spacing alignment
 */
function renderChordsLine(line: ChordProLine, textAlign: 'left' | 'center' | 'right'): string {
  if (!line.chords || line.chords.length === 0) return '';
  
  // Build a string with chords positioned above their syllables
  let chordLine = '';
  let lastEnd = 0;
  
  for (const { chord, position } of line.chords) {
    // Add spaces to reach the chord position
    while (chordLine.length < position) {
      chordLine += ' ';
    }
    chordLine += chord;
    lastEnd = chordLine.length;
  }
  
  return chordLine;
}

export default function Trasmetti() {
  const { salaCode = 'main' } = useParams();
  const { session, loading, mode, setMode, localIP, setLocalIP, localConnected, localLatency } = useHybridBroadcast(salaCode);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentSongbookFile, setCurrentSongbookFile] = useState<SongbookFile | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Screen share viewer hook
  const { remoteStream, isConnecting: screenShareConnecting, isActive: screenShareActive } = useScreenShareViewer({ salaCode });
  
  // Check if screen share is active from database
  const isScreenShareActive = (session as any)?.screen_share_active ?? false;
  
  // Check if ScreenStream is active
  const isScreenStreamActive = (session as any)?.screen_stream_active ?? false;
  const screenStreamUrl = (session as any)?.screen_stream_url ?? '';
  
  // SongBook mode settings
  const isDualBroadcast = (session as any)?.dual_broadcast ?? false;
  // In dual mode: /trasmetti shows catalog text, not songbook content
  const isSongbookMode = !isDualBroadcast && ((session as any)?.songbook_mode ?? false);
  const songbookFileId = (session as any)?.songbook_file_id ?? null;
  const songbookShowChords = (session as any)?.songbook_show_chords_on_tv ?? false;
  const songbookTranspose = (session as any)?.songbook_transpose ?? 0;
  const songbookViewMode = ((session as any)?.songbook_view_mode as string) || 'chordpro';
  
  // View mode from database (admin controlled)
  const viewMode: LyricsViewMode = isSongbookMode 
    ? (songbookViewMode as LyricsViewMode) || 'chordpro'
    : (((session as any)?.tv_view_mode as LyricsViewMode) || 'karaoke');
  
  // Highlight enabled from database (admin controlled)
  // In dual broadcast, disable per-line highlighting on TV since highlight_line comes from chordpro indices
  const highlightEnabled = isDualBroadcast ? false : ((session as any)?.highlight_enabled ?? true);
  
  // Number of lines to highlight (1-6)
  const highlightLinesCount = (session as any)?.highlight_lines_count ?? 1;
  
  // Highlight style: gradient (main brighter) or uniform (all same)
  const highlightStyle: 'gradient' | 'uniform' | 'uniform-gradient' = (session as any)?.highlight_style ?? 'gradient';
  
  // Is broadcasting? (admin controls when to show lyrics vs waiting screen)
  const isBroadcasting = (session as any)?.is_broadcasting ?? false;
  
  const lyricsRef = useRef<HTMLDivElement>(null);

  // Pedal control: scroll mode for TV display
  usePedalScroll({
    page: 'trasmetti',
    scrollRef: lyricsRef as React.RefObject<HTMLElement>,
  });

  // Extract TV settings from session with defaults
  const tvSettings = useMemo(() => ({
    title: (session as any)?.tv_title ?? 'Open Mic',
    subtitle: (session as any)?.tv_subtitle ?? 'NonceDuo Live Experience',
    footer: (session as any)?.tv_footer ?? 'Powered by NonceDuo',
    qrUrl: (session as any)?.tv_qr_url ?? '',
    logoUrl: (session as any)?.tv_logo_url ?? '',
    qrCta: (session as any)?.tv_qr_cta || 'Scansiona per prenotare la tua canzone',
    showQr: (session as any)?.tv_show_qr ?? true,
    showLogo: (session as any)?.tv_show_logo ?? true,
    showTitle: (session as any)?.tv_show_title ?? true,
    showSubtitle: (session as any)?.tv_show_subtitle ?? true,
    showFooter: (session as any)?.tv_show_footer ?? true,
    showStatus: (session as any)?.tv_show_status ?? true,
    positions: (session as any)?.tv_element_positions || DEFAULT_POSITIONS,
    scrollSpeed: (session as any)?.scroll_speed ?? 3,
    fontSize: (session as any)?.font_size ?? 100,
    textAlign: ((session as any)?.text_align as 'left' | 'center' | 'right') || 'center',
  }), [session]);

  const lines = useMemo(() => 
    currentSong?.testo?.split('\n').filter(line => line.trim()) || []
  , [currentSong?.testo]);

  // Parse songbook file with transpose
  const parsedSongbook: ChordProSong | null = useMemo(() => {
    if (!currentSongbookFile) return null;
    const parsed = parseChordPro(currentSongbookFile.content);
    return transposeSong(parsed, songbookTranspose);
  }, [currentSongbookFile, songbookTranspose]);

  // Fetch current song when it changes (regular catalog songs)
  // Fallback chain: Cloud → LAN mini-server → IndexedDB cache
  useEffect(() => {
    const fetchSong = async () => {
      if (!session?.current_song_id) {
        setCurrentSong(null);
        return;
      }

      // Try Cloud and LAN in parallel — use whichever responds first
      const localIP = safeGetItem('local', 'broadcast_local_ip') || '';

      const cloudPromise = (async (): Promise<Song | null> => {
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
          return data || null;
        } catch {
          return null;
        }
      })();

      const lanPromise = (async (): Promise<Song | null> => {
        if (!localIP) return null;
        try {
          const resp = await fetch(`http://${localIP}:8080/api/catalog/list`, {
            signal: AbortSignal.timeout(3000),
          });
          if (!resp.ok) return null;
          const catalog = await resp.json();
          if (!Array.isArray(catalog)) return null;
          const found = catalog.find((s: any) => s.id === session.current_song_id);
          if (!found) return null;
          return {
            id: found.id || session.current_song_id,
            titolo: found.titolo || found.title || '',
            artista: found.artista || found.artist || '',
            testo: found.testo || found.text || null,
          };
        } catch {
          return null;
        }
      })();

      // Race: use first non-null result
      const results = await Promise.allSettled([cloudPromise, lanPromise]);
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
          setCurrentSong(r.value);
          return;
        }
      }

      // 3) Fallback to IndexedDB cache (offline)
      const cached = await getCachedSongById(session.current_song_id);
      if (cached) {
        setCurrentSong({
          id: cached.id,
          titolo: cached.titolo,
          artista: cached.artista,
          testo: cached.testo,
        });
      }
    };

    fetchSong();
  }, [session?.current_song_id]);

  // Fetch songbook file when in songbook mode (with cache fallback)
  // Fallback chain: Cloud → LAN mini-server → IndexedDB cache
  useEffect(() => {
    const fetchSongbookFile = async () => {
      if (!isSongbookMode || !songbookFileId) {
        setCurrentSongbookFile(null);
        return;
      }

      // Try Cloud and LAN in parallel
      const localIP = safeGetItem('local', 'broadcast_local_ip') || '';

      const cloudPromise = (async (): Promise<SongbookFile | null> => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          const { data } = await supabase
            .from('songbook_files')
            .select('id, title, artist, content')
            .eq('id', songbookFileId)
            .abortSignal(controller.signal)
            .single();
          clearTimeout(timeout);
          return data || null;
        } catch {
          return null;
        }
      })();

      const lanPromise = (async (): Promise<SongbookFile | null> => {
        if (!localIP) return null;
        try {
          // Try direct lookup first (now supports supabase_id matching)
          const resp = await fetch(`http://${localIP}:8080/api/songbook/${songbookFileId}`, {
            signal: AbortSignal.timeout(3000),
          });
          if (resp.ok) {
            const ct = resp.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
              const file = await resp.json();
              if (file?.content) {
                return {
                  id: file.id || songbookFileId,
                  title: file.title || '',
                  artist: file.artist || null,
                  content: file.content,
                };
              }
            }
          }
          // Fallback: search all files by supabase_id/id/slug
          const allResp = await fetch(`http://${localIP}:8080/api/songbook/all`, {
            signal: AbortSignal.timeout(3000),
          });
          if (!allResp.ok) return null;
          const allFiles = await allResp.json();
          if (!Array.isArray(allFiles)) return null;
          const match = allFiles.find((f: any) => f.supabase_id === songbookFileId || f.id === songbookFileId || f.slug === songbookFileId);
          if (!match?.content) return null;
          return {
            id: match.id || songbookFileId,
            title: match.title || '',
            artist: match.artist || null,
            content: match.content,
          };
        } catch {
          return null;
        }
      })();

      const results = await Promise.allSettled([cloudPromise, lanPromise]);
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
          setCurrentSongbookFile(r.value);
          return;
        }
      }

      // 3) Fallback to IndexedDB cache
      const { getCachedFile } = await import('@/lib/songbookCache');
      const cached = await getCachedFile(songbookFileId);
      if (cached) {
        setCurrentSongbookFile({ id: cached.id, title: cached.title, artist: cached.artist, content: cached.content });
      }
    };

    fetchSongbookFile();
  }, [isSongbookMode, songbookFileId]);

  // Use session highlight_line directly — no intermediate state to avoid double renders
  const highlightLine = session?.highlight_line ?? 0;

  // Scroll highlighted line(s) into view — center the GROUP of highlighted lines
  // In songbook mode: always follow highlight_line for cross-view text alignment
  // In normal mode: only follow when highlight is enabled
  // Track last scroll target for smooth interpolation
  const scrollTargetRef = useRef<number | null>(null);
  const scrollAnimFrameRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (!lyricsRef.current || !isBroadcasting) return;
    // In dual broadcast, highlight_line comes from chordpro indexing which doesn't match catalog text
    // Use scroll_position ratio instead (handled in the next effect)
    if (isDualBroadcast) return;
    const shouldFollow = isSongbookMode || (highlightEnabled && lines.length > 0);
    if (!shouldFollow) return;
    
    const container = lyricsRef.current;
    const firstEl = container.querySelector(`[data-line="${highlightLine}"]`) as HTMLElement;
    if (!firstEl) return;

    // Find the last highlighted line to center the whole group
    const lastHighlightIdx = highlightLine + highlightLinesCount - 1;
    const lastEl = container.querySelector(`[data-line="${lastHighlightIdx}"]`) as HTMLElement;

    // Calculate the center of the highlight group
    const groupTop = firstEl.offsetTop;
    const groupBottom = lastEl 
      ? lastEl.offsetTop + lastEl.offsetHeight 
      : firstEl.offsetTop + firstEl.offsetHeight;
    const groupCenter = (groupTop + groupBottom) / 2;
    const target = Math.max(0, groupCenter - container.clientHeight / 2);

    // Fast interpolated scroll (~120ms) instead of browser 'smooth' (~300ms)
    if (scrollAnimFrameRef.current) cancelAnimationFrame(scrollAnimFrameRef.current);
    const startPos = container.scrollTop;
    const distance = target - startPos;
    if (Math.abs(distance) < 2) { container.scrollTop = target; return; }
    const duration = Math.min(120, Math.abs(distance) * 0.5); // faster for small jumps
    const startTime = performance.now();
    
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // ease-out cubic for snappy feel
      const eased = 1 - Math.pow(1 - progress, 3);
      container.scrollTop = startPos + distance * eased;
      if (progress < 1) {
        scrollAnimFrameRef.current = requestAnimationFrame(animate);
      }
    };
    scrollAnimFrameRef.current = requestAnimationFrame(animate);
    
    return () => { if (scrollAnimFrameRef.current) cancelAnimationFrame(scrollAnimFrameRef.current); };
  }, [highlightLine, highlightLinesCount, lines.length, highlightEnabled, isSongbookMode, isBroadcasting, isDualBroadcast]);

  // Follow scroll_position (0-1000) — always for songbook, only when highlight OFF for normal
  // In dual broadcast: ALWAYS use scroll_position (highlight_line indices come from chordpro, not catalog)
  useEffect(() => {
    if (!lyricsRef.current) return;
    if (!isBroadcasting) return;
    const hasContent = session?.display_mode === 'lyrics' && (currentSong || (isSongbookMode && parsedSongbook));
    if (!hasContent) return;
    // In songbook mode, always follow scroll_position (no highlight system)
    // In dual broadcast mode, always follow scroll_position (highlight_line doesn't match catalog text)
    // In normal mode, only follow when highlight is disabled
    if (isSongbookMode) return; // songbook uses highlight_line for sync
    if (!isDualBroadcast && highlightEnabled) return;

    const scrollPosition = (session as any)?.scroll_position ?? 0;
    scrollElementToRatio(lyricsRef.current, scrollPosition);
  }, [
    (session as any)?.scroll_position,
    highlightEnabled,
    isBroadcasting,
    session?.display_mode,
    currentSong?.id,
    parsedSongbook?.title,
    isSongbookMode,
    isDualBroadcast,
    lines.length,
    viewMode,
  ]);

  // AUTO-SCROLL: Tempo-based auto-scroll when enabled
  const autoScrollActive = (session as any)?.auto_scroll_active ?? false;
  const autoScrollBpm = (session as any)?.auto_scroll_bpm ?? 60;
  const autoScrollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!lyricsRef.current) return;
    if (!isBroadcasting) return;
    if (!autoScrollActive) {
      // Cancel any running auto-scroll
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
      }
      return;
    }

    // Calculate scroll speed based on BPM
    // At 60 BPM, scroll ~1 pixel per frame (60fps)
    // At 120 BPM, scroll ~2 pixels per frame
    const pixelsPerBeat = 30; // pixels to scroll per beat
    const beatsPerSecond = autoScrollBpm / 60;
    const pixelsPerSecond = pixelsPerBeat * beatsPerSecond;
    const pixelsPerFrame = pixelsPerSecond / 60; // assuming 60fps

    let lastTime = performance.now();
    let accumulator = 0;

    const scroll = (currentTime: number) => {
      if (!lyricsRef.current) return;
      
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      // Accumulate fractional pixels
      accumulator += (pixelsPerSecond * deltaTime) / 1000;
      
      if (accumulator >= 1) {
        const pixelsToScroll = Math.floor(accumulator);
        accumulator -= pixelsToScroll;
        
        lyricsRef.current.scrollTop += pixelsToScroll;
        
        // Check if we reached the end
        const maxScroll = lyricsRef.current.scrollHeight - lyricsRef.current.clientHeight;
        if (lyricsRef.current.scrollTop >= maxScroll) {
          // Stop auto-scroll when we reach the end
          return;
        }
      }
      
      autoScrollRef.current = requestAnimationFrame(scroll);
    };

    autoScrollRef.current = requestAnimationFrame(scroll);

    return () => {
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
      }
    };
  }, [autoScrollActive, autoScrollBpm, isBroadcasting]);

  // Generate QR code
  useEffect(() => {
    const generateQR = async () => {
      try {
        const qrDestination = tvSettings.qrUrl || 'https://nonceduo.com';
        // Se è un URL assoluto, usalo direttamente; altrimenti usa il dominio di produzione
        let fullUrl: string;
        if (qrDestination.startsWith('http')) {
          fullUrl = qrDestination;
        } else {
          const baseUrl = 'https://nonceduo.com';
          fullUrl = `${baseUrl}${qrDestination.startsWith('/') ? '' : '/'}${qrDestination}`;
        }
        
        const dataUrl = await QRCode.toDataURL(fullUrl, {
          width: 280,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        });
        setQrCodeDataUrl(dataUrl);
      } catch (err) {
        console.error('QR generation error:', err);
      }
    };
    
    generateQR();
  }, [tvSettings.qrUrl]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
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

  // SCREEN STREAM MODE - Redirect to ScreenStream URL directly
  // This avoids Mixed Content issues (HTTPS page loading HTTP iframe)
  // Only redirect if we're on a local network (HTTP) or user explicitly wants it
  useEffect(() => {
    if (isScreenStreamActive && screenStreamUrl) {
      // Check if we're already on the ScreenStream URL
      if (window.location.href.includes(screenStreamUrl.replace('http://', '').replace('https://', ''))) {
        return;
      }
      // Check if current page is HTTP (local network)
      const isHttpPage = window.location.protocol === 'http:';
      if (isHttpPage) {
        // Safe to redirect on HTTP
        window.location.href = screenStreamUrl;
      }
      // On HTTPS, we'll show an overlay instead (handled in render)
    }
  }, [isScreenStreamActive, screenStreamUrl]);

  const getPosition = (elementId: string): React.CSSProperties => {
    const pos = tvSettings.positions[elementId] || DEFAULT_POSITIONS[elementId] || { x: 50, y: 50 };
    return {
      position: 'absolute',
      left: `${pos.x}%`,
      top: `${pos.y}%`,
      transform: 'translate(-50%, -50%)',
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-white/50">Caricamento...</div>
      </div>
    );
  }

  // SCREEN STREAM MODE - Show redirect message when on HTTPS
  if (isScreenStreamActive && screenStreamUrl) {
    const isHttps = window.location.protocol === 'https:';
    if (isHttps) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-8">
          <div className="text-center space-y-6 max-w-lg">
            <div className="w-20 h-20 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
              <Maximize className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-white">ScreenStream Attivo</h1>
            <p className="text-white/70 text-lg">
              Per visualizzare lo stream, apri questo URL sulla TV:
            </p>
            <div className="bg-white/10 rounded-xl p-4">
              <code className="text-xl text-primary font-mono break-all">
                {screenStreamUrl}
              </code>
            </div>
            <p className="text-white/50 text-sm">
              Oppure apri <code className="text-primary">http://</code> (non https) su questa pagina per il redirect automatico
            </p>
          </div>
        </div>
      );
    }
    // On HTTP, we already redirected via useEffect
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-white/50">Reindirizzamento a ScreenStream...</div>
      </div>
    );
  }

  // SCREEN SHARE MODE - Priority display when active
  if (isScreenShareActive) {
    return (
      <>
        <ScreenShareViewer 
          stream={remoteStream} 
          isConnecting={screenShareConnecting} 
        />
        <TVGameOverlay />
      </>
    );
  }

  // SONGBOOK MODE - ChordPro display with optional chords
  if (isBroadcasting && isSongbookMode && parsedSongbook) {
    const backgroundColor = getColorForSong(currentSongbookFile?.id || 'default');
    
    return (
      <>
      <div className={cn(
        'h-screen relative overflow-hidden flex flex-col',
        viewMode === 'chordpro' ? 'bg-slate-900 text-white' : 
        viewMode === 'spotify' ? cn('text-white bg-gradient-to-b', backgroundColor) :
        viewMode === 'karaoke' ? 'bg-black text-white' :
        'bg-background text-foreground'
      )}>
        {/* Ambient background for karaoke mode */}
        {viewMode === 'karaoke' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-black to-gray-900/50" />
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[200px]" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[200px]" />
          </div>
        )}
        
        {/* Header with song info */}
        <div className={cn(
          "relative z-10 px-6 md:px-8 pt-6 md:pt-8 pb-4",
          viewMode === 'compact' && 'border-b'
        )}>
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-4 md:gap-6 min-w-0 flex-1">
              {tvSettings.showLogo && (
                <img 
                  src={tvSettings.logoUrl || brandLogoText} 
                  alt="Logo" 
                  className={cn(
                    "w-auto object-contain flex-shrink-0",
                    viewMode === 'karaoke' ? 'h-10 md:h-16 opacity-80' : 'h-10 md:h-14 opacity-90'
                  )}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = brandLogoText;
                  }}
                />
              )}
              <div className="min-w-0">
                <h1 className={cn(
                  "font-bold tracking-tight truncate",
                  viewMode === 'karaoke' ? 'text-2xl sm:text-3xl md:text-5xl lg:text-6xl' :
                  'text-2xl sm:text-3xl md:text-4xl lg:text-5xl'
                )}>
                  {parsedSongbook.title || currentSongbookFile?.title}
                </h1>
                <p className={cn(
                  "mt-1 font-medium truncate",
                  viewMode === 'karaoke' ? 'text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/60 font-light' :
                  'text-lg sm:text-xl md:text-2xl text-white/80'
                )}>
                  {parsedSongbook.artist || currentSongbookFile?.artist}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Key indicator */}
              {parsedSongbook.key && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full">
                  <Guitar className="w-4 h-4" />
                  <span className="font-mono text-sm">{parsedSongbook.key}</span>
                </div>
              )}
              {songbookTranspose !== 0 && (
                <div className="flex items-center gap-1 px-3 py-1.5 bg-primary/20 rounded-full text-sm">
                  <span className="font-mono">
                    {songbookTranspose > 0 ? '+' : ''}{songbookTranspose}
                  </span>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className={cn(
                  viewMode === 'compact' ? '' : 'text-white/60 hover:text-white hover:bg-white/10'
                )}
              >
                <Maximize className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* ChordPro Content */}
        <div 
          ref={lyricsRef}
          className="relative z-10 flex-1 min-h-0 px-6 md:px-12 lg:px-16 py-6 overflow-y-auto"
        >
          <div className={cn(
            "max-w-5xl mx-auto space-y-1",
            viewMode === 'spotify' && 'bg-black/30 backdrop-blur-sm rounded-2xl p-8 md:p-12 shadow-2xl',
            tvSettings.textAlign === 'left' && 'text-left',
            tvSettings.textAlign === 'center' && 'text-center',
            tvSettings.textAlign === 'right' && 'text-right'
          )} style={{ overflowWrap: 'break-word', wordBreak: 'keep-all' }}>
            {parsedSongbook.lines.map((line, index) => {
              const isMainHighlight = highlightLine === index;
              const distanceFromMain = index - highlightLine;
              const isInHighlightRange = distanceFromMain >= 0 && distanceFromMain < highlightLinesCount;
              const isPast = index < highlightLine;
              
              // Opacity logic
              let opacity = 1;
              if (highlightEnabled) {
                if (isInHighlightRange) {
                  opacity = highlightStyle === 'gradient' ? (isMainHighlight ? 1 : 0.95 - (distanceFromMain * 0.05)) : 1;
                } else if (isPast) {
                  opacity = 0.55;
                } else {
                  opacity = 0.75;
                }
              }
              
              const baseFontSize = Math.max(16, 28 * tvSettings.fontSize / 100);
              const chordFontSize = baseFontSize * 0.85;

              // Skip directives and comments
              if (line.type === 'directive' || line.type === 'comment') {
                // Only show section markers
                if (line.directiveKey && ['chorus', 'verse', 'bridge', 'intro', 'outro', 'tab'].includes(line.directiveKey)) {
                  return (
                    <div 
                      key={index}
                      data-line={index}
                      className="py-2 mt-4"
                      style={{ opacity }}
                    >
                      <span className="inline-block px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium uppercase tracking-wider">
                        {line.directiveValue || line.directiveKey}
                      </span>
                    </div>
                  );
                }
                return null;
              }

              if (line.type === 'empty') {
                return <div key={index} data-line={index} className="h-4" />;
              }

              // Chord-text line
              if (line.type === 'chord-text' && line.chords && songbookShowChords) {
                return (
                  <div 
                    key={index}
                    data-line={index}
                    className={cn(
                      "transition-opacity duration-150 py-2 px-4 -mx-2 rounded-lg",
                      highlightEnabled && (highlightStyle !== 'gradient' ? isInHighlightRange : isMainHighlight) && "bg-primary/20 ring-2 ring-primary/40 scale-[1.01]",
                      highlightEnabled && (highlightStyle === 'gradient' && isInHighlightRange && !isMainHighlight) && "bg-primary/10"
                    )}
                    style={{ opacity, fontSize: `${baseFontSize}px` }}
                  >
                    {renderResponsiveChordLine(line, { 
                      coloredChords: true,
                      chordClassName: 'text-primary'
                    })}
                  </div>
                );
              }

              // Plain text line (or chord-text without showing chords)
              return (
                <div 
                  key={index}
                  data-line={index}
                  className={cn(
                    "transition-opacity duration-150 py-2 px-4 -mx-2 rounded-lg leading-relaxed",
                    highlightEnabled && (highlightStyle !== 'gradient' ? isInHighlightRange : isMainHighlight) && "bg-primary/20 ring-2 ring-primary/40 scale-[1.01] font-semibold",
                    highlightEnabled && (highlightStyle === 'gradient' && isInHighlightRange && !isMainHighlight) && "bg-primary/10"
                  )}
                  style={{ opacity, fontSize: `${baseFontSize}px` }}
                >
                  {line.text || '\u00A0'}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className={cn(
          "absolute bottom-0 left-0 right-0 p-4 pointer-events-none",
          viewMode === 'compact' ? 'bg-gradient-to-t from-background to-transparent' :
          'bg-gradient-to-t from-black/60 to-transparent'
        )}>
          <div className={cn(
            "flex items-center justify-center gap-2 text-sm",
            viewMode === 'compact' ? 'text-muted-foreground' : 'text-white/40'
          )}>
            <Guitar className="w-4 h-4" />
            <span>{tvSettings.title} • SongBook {songbookShowChords ? '(Accordi)' : ''}</span>
          </div>
        </div>
      </div>
      <TVGameOverlay />
      </>
    );
  }

  // LYRICS MODE - Only show when broadcasting AND has a song
  if (isBroadcasting && session?.display_mode === 'lyrics' && currentSong) {
    
    // SPOTIFY MODE - Colorful background
    if (viewMode === 'spotify') {
      const backgroundColor = getColorForSong(currentSong.id);
      
      return (
        <>
        <div className={cn('h-screen text-white relative overflow-hidden flex flex-col bg-gradient-to-b', backgroundColor)}>
          {/* Header with song info */}
          <div className="relative z-10 px-6 md:px-8 pt-6 md:pt-8 pb-4">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center gap-4 md:gap-6 min-w-0 flex-1">
                {tvSettings.showLogo && (
                  <img 
                    src={tvSettings.logoUrl || brandLogoText} 
                    alt="Logo" 
                    className="h-10 md:h-14 w-auto object-contain opacity-90 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = brandLogoText;
                    }}
                  />
                )}
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white truncate">
                    {currentSong.titolo}
                  </h1>
                  <p className="text-lg sm:text-xl md:text-2xl text-white/80 mt-1 font-medium truncate">
                    {currentSong.artista}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullscreen}
                  className="text-white/60 hover:text-white hover:bg-white/20"
                >
                  <Maximize className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Lyrics display - Spotify-style with card */}
          <div 
            ref={lyricsRef}
            className="relative z-10 flex-1 min-h-0 px-4 md:px-8 py-4 overflow-y-auto"
          >
            <div className={cn(
              "max-w-4xl mx-auto bg-black/30 backdrop-blur-sm rounded-2xl p-8 md:p-12 shadow-2xl space-y-4 md:space-y-6",
              tvSettings.textAlign === 'left' && 'text-left',
              tvSettings.textAlign === 'center' && 'text-center',
              tvSettings.textAlign === 'right' && 'text-right'
            )} style={{ overflowWrap: 'break-word', wordBreak: 'keep-all' }}>
              {lines.map((line, index) => {
                const isMainHighlight = highlightLine === index;
                // Check if this line is within the highlight range (next lines after the current one)
                const distanceFromMain = index - highlightLine;
                const isInHighlightRange = distanceFromMain >= 0 && distanceFromMain < highlightLinesCount;
                const isPast = index < highlightLine;
                
                let opacity = 1;
                if (highlightEnabled) {
                  if (isInHighlightRange) {
                    opacity = highlightStyle === 'gradient' ? (isMainHighlight ? 1 : 0.92 - (distanceFromMain * 0.05)) : 1;
                  } else if (isPast) opacity = 0.55;
                  else opacity = 0.8;
                }
                
                const baseFontSize = Math.max(14, 24 * tvSettings.fontSize / 100);
                
                return (
                  <p
                    key={index}
                    data-line={index}
                    className={cn(
                      "font-sans leading-loose transition-opacity duration-150 py-3 px-6 -mx-4 rounded-xl",
                      highlightEnabled && (highlightStyle !== 'gradient' ? isInHighlightRange : isMainHighlight) && "bg-yellow-400/30 ring-2 ring-yellow-400/50 scale-[1.02] font-bold",
                      highlightEnabled && (highlightStyle === 'gradient' && isInHighlightRange && !isMainHighlight) && "bg-yellow-400/15 ring-1 ring-yellow-400/30"
                    )}
                    style={{ opacity, fontSize: `${baseFontSize}px` }}
                  >
                    {line || '\u00A0'}
                  </p>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent pointer-events-none">
            <div className="flex items-center justify-center gap-2 text-white/50 text-sm">
              <Mic className="w-4 h-4" />
              <span>{tvSettings.title} • Spotify Mode</span>
            </div>
          </div>
        </div>
        <TVGameOverlay />
        </>
      );
    }
    
    // KARAOKE MODE - Dark with ambient glow (default)
    if (viewMode === 'karaoke') {
      return (
        <>
        <div className="h-screen bg-black text-white relative overflow-hidden flex flex-col">
          {/* Ambient background - subtle, professional */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-black to-gray-900/50" />
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[200px]" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[200px]" />
          </div>

          {/* Header with song info */}
          <div className="relative z-10 px-6 md:px-8 pt-6 md:pt-8 pb-4">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
              <div className="flex items-center gap-4 md:gap-6 min-w-0 flex-1">
                {tvSettings.showLogo && (
                  <img 
                    src={tvSettings.logoUrl || brandLogoText} 
                    alt="Logo" 
                    className="h-10 md:h-16 w-auto object-contain opacity-80 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = brandLogoText;
                    }}
                  />
                )}
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white truncate">
                    {currentSong.titolo}
                  </h1>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/60 mt-1 font-light truncate">
                    {currentSong.artista}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullscreen}
                  className="text-white/40 hover:text-white hover:bg-white/10"
                >
                  <Maximize className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Lyrics display - Karaoke-style with glow */}
          <div 
            ref={lyricsRef}
            className="relative z-10 flex-1 min-h-0 px-8 md:px-16 lg:px-24 py-8 overflow-y-auto"
          >
            <div className={cn(
              "max-w-5xl mx-auto space-y-4 md:space-y-6 py-[10vh]",
              tvSettings.textAlign === 'left' && 'text-left',
              tvSettings.textAlign === 'center' && 'text-center',
              tvSettings.textAlign === 'right' && 'text-right'
            )} style={{ overflowWrap: 'break-word', wordBreak: 'keep-all' }}>
              {lines.map((line, index) => {
                const isMainHighlight = highlightLine === index;
                // Check if this line is within the highlight range
                const distanceFromMain = index - highlightLine;
                const isInHighlightRange = distanceFromMain >= 0 && distanceFromMain < highlightLinesCount;
                const isPast = index < highlightLine;
                const distanceFromHighlight = Math.abs(index - highlightLine);
                
                // When highlight is OFF, all lines fully visible
                let opacity = 1;
                if (highlightEnabled) {
                  if (isInHighlightRange) {
                    if (highlightStyle === 'gradient') {
                      opacity = isMainHighlight ? 1 : 0.95 - (distanceFromMain * 0.03);
                    } else {
                      opacity = 1;
                    }
                  } else if (isPast) {
                    opacity = 0.5;
                  } else if (distanceFromHighlight === highlightLinesCount) {
                    opacity = 0.85;
                  } else if (distanceFromHighlight === highlightLinesCount + 1) {
                    opacity = 0.7;
                  } else {
                    opacity = 0.55;
                  }
                }
                
                const baseFontSize = Math.max(18, 32 * tvSettings.fontSize / 100);
                // gradient: main line biggest, secondary lines progressively smaller
                // uniform: all highlighted lines exactly same size, no enlargement
                // uniform-gradient (Risalto): ALL highlighted lines enlarge equally
                const isUniform = highlightStyle === 'uniform';
                const isRisalto = highlightStyle === 'uniform-gradient';
                const isGradient = highlightStyle === 'gradient';

                // Calculate font size for this line
                let lineFontSize = baseFontSize;
                if (highlightEnabled && isInHighlightRange) {
                  if (isGradient) {
                    // Main line biggest, others progressively smaller
                    lineFontSize = isMainHighlight 
                      ? baseFontSize * 1.4 
                      : baseFontSize * (1.25 - distanceFromMain * 0.03);
                  } else if (isRisalto) {
                    // ALL highlighted lines enlarge equally
                    lineFontSize = baseFontSize * 1.3;
                  }
                  // uniform: stays at baseFontSize (no enlargement)
                }

                // Color logic
                const showPrimaryColor = highlightEnabled && isInHighlightRange && (isGradient ? isMainHighlight : true);
                const showSecondaryColor = highlightEnabled && isInHighlightRange && isGradient && !isMainHighlight;

                return (
                  <p
                    key={index}
                    data-line={index}
                    className={cn(
                      "font-bold leading-relaxed transition-[color,opacity,text-shadow] duration-500 ease-out",
                      "font-sans tracking-wide",
                      showPrimaryColor && "text-primary",
                      showSecondaryColor && "text-primary/80"
                    )}
                    style={{
                      opacity,
                      fontSize: `${lineFontSize}px`,
                      textShadow: (highlightEnabled && isInHighlightRange)
                        ? isMainHighlight && isGradient
                          ? '0 0 40px hsl(var(--primary) / 0.4), 0 0 80px hsl(var(--primary) / 0.2)'
                          : '0 0 30px hsl(var(--primary) / 0.3)'
                        : 'none',
                    }}
                  >
                    {line || '\u00A0'}
                  </p>
                );
              })}
            </div>
          </div>

          {/* Minimal footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
            <div className="flex items-center justify-center gap-2 text-white/30 text-sm">
              <Mic className="w-4 h-4" />
              <span>{tvSettings.title} • Karaoke Mode</span>
            </div>
          </div>
        </div>
        <TVGameOverlay />
        </>
      );
    }
    
    // COMPACT MODE - Clean, centered text, no line numbers, larger font
    return (
      <>
      <div className="h-screen bg-background text-foreground relative overflow-hidden flex flex-col">
        {/* Header with song info */}
        <div className="relative z-10 px-6 md:px-8 pt-6 md:pt-8 pb-4 border-b">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-4 md:gap-6 min-w-0 flex-1">
              {tvSettings.showLogo && (
                <img 
                  src={tvSettings.logoUrl || brandLogoText} 
                  alt="Logo" 
                  className="h-10 md:h-12 w-auto object-contain flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = brandLogoText;
                  }}
                />
              )}
              <div className="min-w-0 text-center flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight truncate">
                  {currentSong.titolo}
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mt-1 truncate">
                  {currentSong.artista}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleFullscreen}
              >
                <Maximize className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Lyrics display - Compact: centered, larger font, no line numbers */}
        <div 
          ref={lyricsRef}
          className="relative z-10 flex-1 min-h-0 px-6 md:px-8 py-8 overflow-y-auto"
        >
          <div className={cn(
            "max-w-4xl mx-auto space-y-4",
            tvSettings.textAlign === 'left' && 'text-left',
            tvSettings.textAlign === 'center' && 'text-center',
            tvSettings.textAlign === 'right' && 'text-right'
          )} style={{ overflowWrap: 'break-word', wordBreak: 'keep-all' }}>
            {lines.map((line, index) => {
              const isMainHighlight = highlightLine === index;
              // Check if this line is within the highlight range
              const distanceFromMain = index - highlightLine;
              const isInHighlightRange = distanceFromMain >= 0 && distanceFromMain < highlightLinesCount;
              
              let opacity = 1;
              if (highlightEnabled) {
                if (isInHighlightRange) {
                  opacity = highlightStyle === 'gradient' ? (isMainHighlight ? 1 : 0.95 - (distanceFromMain * 0.05)) : 1;
                } else opacity = 0.7;
              }
              
              const baseFontSize = Math.max(16, 24 * tvSettings.fontSize / 100);
              
              return (
                <p
                  key={index}
                  data-line={index}
                  className={cn(
                    "leading-relaxed transition-opacity duration-150 px-6 py-3 rounded-xl",
                    highlightEnabled && (highlightStyle !== 'gradient' ? isInHighlightRange : isMainHighlight) && "bg-primary/20 text-primary font-bold ring-2 ring-primary/30",
                    highlightEnabled && (highlightStyle === 'gradient' && isInHighlightRange && !isMainHighlight) && "bg-primary/10 text-primary/80 ring-1 ring-primary/20"
                  )}
                  style={{ opacity, fontSize: `${baseFontSize}px` }}
                >
                  {line || '\u00A0'}
                </p>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background to-transparent pointer-events-none">
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Mic className="w-4 h-4" />
            <span>{tvSettings.title} • Compact Mode</span>
          </div>
        </div>
      </div>
      <TVGameOverlay />
      </>
    );
  }

  // WAITING MODE - Promo screen with QR (shown when not broadcasting)
  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white relative overflow-hidden select-none">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[200px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/15 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Content container */}
      <div className="relative z-10 min-h-screen w-full">
        {/* Logo */}
        {tvSettings.showLogo && (
          <div style={getPosition('logo')}>
            <img 
              src={tvSettings.logoUrl || brandLogoText} 
              alt="Logo" 
              className="h-16 md:h-24 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = brandLogoText;
              }}
            />
          </div>
        )}

        {/* Title */}
        {tvSettings.showTitle && (
          <div style={getPosition('title')} className="text-center w-full px-8">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent">
                {tvSettings.title}
              </span>
            </h1>
          </div>
        )}

        {/* Subtitle */}
        {tvSettings.showSubtitle && (
          <div style={getPosition('subtitle')} className="text-center w-full px-8">
            <p className="text-xl md:text-2xl text-white/60 font-light">
              {tvSettings.subtitle}
            </p>
          </div>
        )}

        {/* Status indicator */}
        {tvSettings.showStatus && (
          <div style={getPosition('status')} className="flex justify-center">
            {session?.is_active ? (
              <div className="flex items-center gap-3 px-6 py-3 bg-green-500/20 border border-green-500/30 rounded-full">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-400 font-medium text-lg">
                  Evento in corso
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-6 py-3 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span className="text-yellow-400 font-medium text-lg">
                  In attesa...
                </span>
              </div>
            )}
          </div>
        )}

        {/* QR Code */}
        {tvSettings.showQr && qrCodeDataUrl && (
          <div style={getPosition('qr')} className="flex justify-center">
            <div className="bg-white rounded-2xl p-4 shadow-2xl">
              <img 
                src={qrCodeDataUrl} 
                alt="QR Code per prenotazione" 
                className="w-40 h-40 md:w-56 md:h-56"
              />
            </div>
          </div>
        )}

        {/* QR CTA */}
        {tvSettings.showQr && (
          <div style={getPosition('qr_cta')} className="text-center w-full px-8">
            <p className="text-lg md:text-xl text-white/70">
              {tvSettings.qrCta}
            </p>
          </div>
        )}

        {/* Footer */}
        {tvSettings.showFooter && (
          <div style={getPosition('footer')} className="text-center w-full px-8">
            <p className="text-white/30 text-sm">
              {tvSettings.footer}
            </p>
          </div>
        )}

        {/* Fullscreen + Connection Settings */}
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
          <ConnectionSettings
            mode={mode}
            setMode={setMode}
            localIP={localIP}
            setLocalIP={setLocalIP}
            isLocalConnected={localConnected}
            localLatency={localLatency}
          />
          <Button
            variant="outline"
            size="lg"
            onClick={toggleFullscreen}
            className="border-white/20 text-white hover:bg-white/10 backdrop-blur-sm"
          >
            <Maximize className="w-5 h-5 mr-2" />
            {isFullscreen ? 'Esci' : 'Fullscreen'}
          </Button>
        </div>
      </div>
    </div>
    <TVGameOverlay />
    <TVFuroreOverlay />
    </>
  );
}
