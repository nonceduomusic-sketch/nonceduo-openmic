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

const DEFAULT_POSITIONS: Record<string, ElementPosition> = {
  logo: { x: 50, y: 15 },
  title: { x: 50, y: 35 },
  subtitle: { x: 50, y: 42 },
  status: { x: 50, y: 52 },
  qr: { x: 50, y: 72 },
  qr_cta: { x: 50, y: 88 },
  footer: { x: 50, y: 96 },
};

export default function Trasmetti() {
  const { salaCode = 'main' } = useParams();
  const { session, loading } = useBroadcast(salaCode);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [highlightLine, setHighlightLine] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
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
        setHighlightLine(0);
        setAutoScroll(true);
      }
    };

    fetchSong();
  }, [session?.current_song_id]);

  // Auto-scroll effect
  useEffect(() => {
    if (!autoScroll || !lines.length || session?.display_mode !== 'lyrics') return;
    
    const speed = tvSettings.scrollSpeed || 3;
    const interval = setInterval(() => {
      setHighlightLine(prev => {
        if (prev >= lines.length - 1) {
          return prev; // Stay at last line
        }
        return prev + 1;
      });
    }, (6 - speed) * 2000); // Adjust timing based on speed

    return () => clearInterval(interval);
  }, [autoScroll, lines.length, tvSettings.scrollSpeed, session?.display_mode]);

  // Scroll highlighted line into view
  useEffect(() => {
    if (lyricsRef.current && lines.length > 0) {
      const lineElements = lyricsRef.current.querySelectorAll('[data-line]');
      const highlightedLine = lineElements[highlightLine];
      if (highlightedLine) {
        highlightedLine.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [highlightLine, lines.length]);

  // Generate QR code
  useEffect(() => {
    const generateQR = async () => {
      try {
        const qrDestination = tvSettings.qrUrl || `${window.location.origin}/app`;
        const fullUrl = qrDestination.startsWith('http') 
          ? qrDestination 
          : `${window.location.origin}${qrDestination.startsWith('/') ? '' : '/'}${qrDestination}`;
        
        const dataUrl = await QRCode.toDataURL(fullUrl, {
          width: 280,
          margin: 2,
          color: {
            dark: '#ffffff',
            light: '#00000000',
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

  // LYRICS MODE - Professional Karaoke Style (No chat, clean display)
  if (session?.display_mode === 'lyrics' && currentSong) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden select-none">
        {/* Ambient background - subtle, professional */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-black to-gray-900/50" />
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[200px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[200px]" />
        </div>

        {/* Header with song info */}
        <div className="relative z-10 px-8 pt-8 pb-4">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-6">
              {tvSettings.showLogo && (
                <img 
                  src={tvSettings.logoUrl || brandLogoText} 
                  alt="Logo" 
                  className="h-12 md:h-16 w-auto object-contain opacity-80"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = brandLogoText;
                  }}
                />
              )}
              <div>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white">
                  {currentSong.titolo}
                </h1>
                <p className="text-xl md:text-2xl lg:text-3xl text-white/60 mt-1 font-light">
                  {currentSong.artista}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white/40 hover:text-white hover:bg-white/10"
            >
              <Maximize className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Lyrics display - Spotify-style */}
        <div 
          ref={lyricsRef}
          className="relative z-10 flex-1 px-8 md:px-16 lg:px-24 py-8 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 200px)' }}
        >
          <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 text-center py-[20vh]">
            {lines.map((line, index) => {
              const isHighlighted = highlightLine === index;
              const isPast = index < highlightLine;
              const distanceFromHighlight = Math.abs(index - highlightLine);
              
              // Progressive opacity based on distance
              let opacity = 1;
              if (isPast) opacity = 0.3;
              else if (distanceFromHighlight === 1) opacity = 0.7;
              else if (distanceFromHighlight === 2) opacity = 0.5;
              else if (distanceFromHighlight > 2) opacity = 0.35;
              
              // Font size based on highlight
              const fontSize = isHighlighted 
                ? 'text-3xl md:text-4xl lg:text-5xl' 
                : distanceFromHighlight <= 1 
                  ? 'text-2xl md:text-3xl lg:text-4xl'
                  : 'text-xl md:text-2xl lg:text-3xl';

              return (
                <p
                  key={index}
                  data-line={index}
                  className={cn(
                    "font-bold leading-relaxed transition-all duration-700 ease-out",
                    "font-sans tracking-wide",
                    fontSize,
                    isHighlighted && "text-primary scale-105"
                  )}
                  style={{
                    opacity,
                    textShadow: isHighlighted 
                      ? '0 0 60px hsl(var(--primary) / 0.6), 0 0 120px hsl(var(--primary) / 0.3)'
                      : 'none',
                    transform: isHighlighted ? 'scale(1.05)' : 'scale(1)',
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
            <span>{tvSettings.title}</span>
          </div>
        </div>
      </div>
    );
  }

  // WAITING MODE - Promo screen with QR (No chat)
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
