import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useBroadcast } from '@/hooks/useBroadcast';
import { supabase } from '@/integrations/supabase/client';
import { Maximize, Mic, Music } from 'lucide-react';
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
  }), [session]);

  // Fetch current song when it changes
  useEffect(() => {
    const fetchSong = async () => {
      if (!session?.current_song_id) {
        setCurrentSong(null);
        return;
      }

      const { data } = await supabase
        .from('songs')
        .select('id, titolo, artista, testo')
        .eq('id', session.current_song_id)
        .single();

      if (data) {
        setCurrentSong(data);
      }
    };

    fetchSong();
  }, [session?.current_song_id]);

  // Generate QR code with proper settings
  useEffect(() => {
    const generateQR = async () => {
      try {
        // Use custom URL or default to /app
        const qrDestination = tvSettings.qrUrl || `${window.location.origin}/app`;
        const fullUrl = qrDestination.startsWith('http') 
          ? qrDestination 
          : `${window.location.origin}${qrDestination.startsWith('/') ? '' : '/'}${qrDestination}`;
        
        const dataUrl = await QRCode.toDataURL(fullUrl, {
          width: 280,
          margin: 2,
          color: {
            dark: '#ffffff',
            light: '#00000000', // transparent background
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

  // Listen for fullscreen changes
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

  // LYRICS MODE - Show karaoke-style lyrics
  if (session?.display_mode === 'lyrics' && currentSong) {
    const lines = currentSong.testo?.split('\n').filter(line => line.trim()) || [];

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 text-white relative overflow-hidden">
        {/* Ambient background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/15 rounded-full blur-[150px]" />
        </div>

        {/* Header with song info */}
        <div className="relative z-10 p-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                {currentSong.titolo}
              </h1>
              <p className="text-xl md:text-2xl text-white/70 mt-1">
                {currentSong.artista}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <Maximize className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Lyrics display */}
        <div className="relative z-10 flex-1 px-6 md:px-12 py-8 overflow-y-auto max-h-[calc(100vh-180px)]">
          <div className="space-y-4 md:space-y-6 text-center">
            {lines.map((line, index) => (
              <p
                key={index}
                className={cn(
                  "text-2xl md:text-4xl lg:text-5xl font-medium leading-relaxed transition-all duration-300",
                  session.highlight_line === index
                    ? "text-primary scale-105 drop-shadow-[0_0_30px_rgba(var(--primary),0.5)]"
                    : "text-white/80"
                )}
              >
                {line || '\u00A0'}
              </p>
            ))}
          </div>
        </div>

        {/* Footer with branding */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
            <Mic className="w-4 h-4" />
            <span>{tvSettings.title}</span>
          </div>
        </div>
      </div>
    );
  }

  // WAITING MODE - Show promo screen with QR
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white relative overflow-hidden">
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
                // Fallback to brand logo if custom URL fails
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

        {/* Fullscreen button - always visible in corner */}
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
