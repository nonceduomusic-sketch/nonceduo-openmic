import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useBroadcast } from '@/hooks/useBroadcast';
import { supabase } from '@/integrations/supabase/client';
import { Maximize, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';
import brandLogoText from '@/assets/brand-logo-text.png';

interface Song {
  id: string;
  titolo: string;
  artista: string;
  testo: string | null;
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

type LyricsViewMode = 'compact' | 'karaoke' | 'spotify';

export default function Trasmetti() {
  const { salaCode = 'main' } = useParams();
  const { session, loading } = useBroadcast(salaCode);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [highlightLine, setHighlightLine] = useState(0);
  
  // View mode from database (admin controlled)
  const viewMode: LyricsViewMode = ((session as any)?.tv_view_mode as LyricsViewMode) || 'karaoke';
  
  // Highlight enabled from database (admin controlled)
  const highlightEnabled = (session as any)?.highlight_enabled ?? true;
  
  // Is broadcasting? (admin controls when to show lyrics vs waiting screen)
  const isBroadcasting = (session as any)?.is_broadcasting ?? false;
  
  const lyricsRef = useRef<HTMLDivElement>(null);

  // Extract TV settings from session with defaults
  const tvSettings = useMemo(() => ({
    title: (session as any)?.tv_title || 'Open Mic',
    subtitle: (session as any)?.tv_subtitle || 'NonceDuo Live Experience',
    footer: (session as any)?.tv_footer || 'Powered by NonceDuo',
    qrUrl: (session as any)?.tv_qr_url || '',
    logoUrl: (session as any)?.tv_logo_url || '',
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

  // Fetch current song when it changes
  useEffect(() => {
    const fetchSong = async () => {
      if (!session?.current_song_id) {
        setCurrentSong(null);
        setHighlightLine(0);
        return;
      }

      const { data } = await supabase
        .from('songs')
        .select('id, titolo, artista, testo')
        .eq('id', session.current_song_id)
        .single();

      if (data) {
        setCurrentSong(data);
        setHighlightLine(session.highlight_line || 0);
      }
    };

    fetchSong();
  }, [session?.current_song_id]);

  // CRITICAL: Always sync highlight line from session (admin controls via database)
  useEffect(() => {
    if (session?.highlight_line !== undefined && session?.highlight_line !== null) {
      setHighlightLine(session.highlight_line);
    }
  }, [session?.highlight_line]);

  // Scroll highlighted line into view (only when highlight is enabled)
  useEffect(() => {
    if (lyricsRef.current && lines.length > 0 && highlightEnabled) {
      const lineElements = lyricsRef.current.querySelectorAll('[data-line]');
      const highlightedLine = lineElements[highlightLine];
      if (highlightedLine) {
        highlightedLine.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [highlightLine, lines.length, highlightEnabled]);

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

  // LYRICS MODE - Only show when broadcasting AND has a song
  if (isBroadcasting && session?.display_mode === 'lyrics' && currentSong) {
    
    // SPOTIFY MODE - Colorful background
    if (viewMode === 'spotify') {
      const backgroundColor = getColorForSong(currentSong.id);
      
      return (
        <div className={cn('min-h-screen text-white relative overflow-hidden select-none bg-gradient-to-b', backgroundColor)}>
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
            className="relative z-10 flex-1 px-4 md:px-8 py-4 overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 180px)' }}
          >
            <div className={cn(
              "max-w-4xl mx-auto bg-black/30 backdrop-blur-sm rounded-2xl p-8 md:p-12 shadow-2xl space-y-4 md:space-y-6",
              tvSettings.textAlign === 'left' && 'text-left',
              tvSettings.textAlign === 'center' && 'text-center',
              tvSettings.textAlign === 'right' && 'text-right'
            )}>
              {lines.map((line, index) => {
                const isHighlighted = highlightLine === index;
                const isPast = index < highlightLine;
                
                // When highlight is OFF, all lines fully visible
                const opacity = highlightEnabled 
                  ? (isHighlighted ? 1 : isPast ? 0.4 : 0.7)
                  : 1;
                
                const baseFontSize = Math.max(14, 24 * tvSettings.fontSize / 100);
                
                return (
                  <p
                    key={index}
                    data-line={index}
                    className={cn(
                      "font-sans leading-loose transition-all duration-300 py-3 px-6 -mx-4 rounded-xl",
                      highlightEnabled && isHighlighted && "bg-yellow-400/30 ring-2 ring-yellow-400/50 scale-[1.02] font-bold"
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
      );
    }
    
    // KARAOKE MODE - Dark with ambient glow (default)
    if (viewMode === 'karaoke') {
      return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden select-none">
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
            className="relative z-10 flex-1 px-8 md:px-16 lg:px-24 py-8 overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          >
            <div className={cn(
              "max-w-5xl mx-auto space-y-6 md:space-y-8 py-[20vh]",
              tvSettings.textAlign === 'left' && 'text-left',
              tvSettings.textAlign === 'center' && 'text-center',
              tvSettings.textAlign === 'right' && 'text-right'
            )}>
              {lines.map((line, index) => {
                const isHighlighted = highlightLine === index;
                const isPast = index < highlightLine;
                const distanceFromHighlight = Math.abs(index - highlightLine);
                
                // When highlight is OFF, all lines fully visible
                let opacity = 1;
                if (highlightEnabled) {
                  if (isPast) opacity = 0.3;
                  else if (distanceFromHighlight === 1) opacity = 0.7;
                  else if (distanceFromHighlight === 2) opacity = 0.5;
                  else if (distanceFromHighlight > 2) opacity = 0.35;
                }
                
                // Font size from settings
                const baseFontSize = Math.max(18, 32 * tvSettings.fontSize / 100);
                const highlightedFontSize = baseFontSize * 1.4;
                const nearFontSize = baseFontSize * 1.15;

                return (
                  <p
                    key={index}
                    data-line={index}
                    className={cn(
                      "font-bold leading-relaxed transition-all duration-700 ease-out",
                      "font-sans tracking-wide",
                      highlightEnabled && isHighlighted && "text-primary scale-105"
                    )}
                    style={{
                      opacity,
                      fontSize: (highlightEnabled && isHighlighted) 
                        ? `${highlightedFontSize}px` 
                        : (highlightEnabled && distanceFromHighlight <= 1)
                          ? `${nearFontSize}px`
                          : `${baseFontSize}px`,
                      textShadow: (highlightEnabled && isHighlighted)
                        ? '0 0 60px hsl(var(--primary) / 0.6), 0 0 120px hsl(var(--primary) / 0.3)'
                        : 'none',
                      transform: (highlightEnabled && isHighlighted) ? 'scale(1.05)' : 'scale(1)',
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
      );
    }
    
    // COMPACT MODE - Clean, centered text, no line numbers, larger font
    return (
      <div className="min-h-screen bg-background text-foreground relative overflow-hidden select-none">
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
          className="relative z-10 flex-1 px-6 md:px-8 py-8 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 160px)' }}
        >
          <div className={cn(
            "max-w-4xl mx-auto space-y-4",
            tvSettings.textAlign === 'left' && 'text-left',
            tvSettings.textAlign === 'center' && 'text-center',
            tvSettings.textAlign === 'right' && 'text-right'
          )}>
            {lines.map((line, index) => {
              const isHighlighted = highlightLine === index;
              
              // When highlight is OFF, show as continuous block
              const opacity = highlightEnabled 
                ? (isHighlighted ? 1 : 0.5)
                : 1;
              
              const baseFontSize = Math.max(16, 24 * tvSettings.fontSize / 100);
              
              return (
                <p
                  key={index}
                  data-line={index}
                  className={cn(
                    "leading-relaxed transition-all duration-300 px-6 py-3 rounded-xl",
                    highlightEnabled && isHighlighted && "bg-primary/20 text-primary font-bold ring-2 ring-primary/30"
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
    );
  }

  // WAITING MODE - Promo screen with QR (shown when not broadcasting)
  return (
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

        {/* Fullscreen button */}
        <div className="fixed bottom-6 right-6 z-50">
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
  );
}
