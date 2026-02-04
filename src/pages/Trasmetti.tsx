import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useBroadcast } from '@/hooks/useBroadcast';
import { supabase } from '@/integrations/supabase/client';
import { Maximize, Mic, QrCode, Music, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';

interface Song {
  id: string;
  titolo: string;
  artista: string;
  testo: string | null;
}

export default function Trasmetti() {
  const { salaCode = 'main' } = useParams();
  const { session, loading } = useBroadcast(salaCode);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Generate QR code for app
  useEffect(() => {
    const generateQR = async () => {
      try {
        const appUrl = `${window.location.origin}/app`;
        const url = await QRCode.toDataURL(appUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#ffffff',
            light: '#00000000',
          },
        });
        setQrCodeUrl(url);
      } catch (err) {
        console.error('QR generation error:', err);
      }
    };
    generateQR();
  }, []);

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
            <span>NonceDuo Open Mic</span>
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

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8">
        {/* Main Title */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Music className="w-12 h-12 md:w-16 md:h-16 text-primary animate-pulse" />
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent">
              Open Mic
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-white/60 font-light">
            NonceDuo Live Experience
          </p>
        </div>

        {/* Status indicator */}
        {session?.is_active ? (
          <div className="flex items-center gap-3 mb-12 px-6 py-3 bg-green-500/20 border border-green-500/30 rounded-full">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-400 font-medium text-lg">
              Evento in corso
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 mb-12 px-6 py-3 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <span className="text-yellow-400 font-medium text-lg">
              In attesa...
            </span>
          </div>
        )}

        {/* QR Code section */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 text-center">
          <p className="text-lg md:text-xl text-white/80 mb-6">
            Scansiona per prenotare la tua canzone
          </p>
          
          {qrCodeUrl && (
            <div className="bg-white rounded-2xl p-4 inline-block mb-6">
              <img src={qrCodeUrl} alt="QR Code per prenotazione" className="w-48 h-48 md:w-64 md:h-64" />
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-white/50">
            <QrCode className="w-5 h-5" />
            <span className="text-sm md:text-base">nonceduo.com/app</span>
          </div>
        </div>

        {/* Fullscreen button */}
        <Button
          variant="outline"
          size="lg"
          onClick={toggleFullscreen}
          className="mt-8 border-white/20 text-white hover:bg-white/10"
        >
          <Maximize className="w-5 h-5 mr-2" />
          {isFullscreen ? 'Esci da Schermo Intero' : 'Schermo Intero'}
        </Button>

        {/* Bottom branding */}
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p className="text-white/30 text-sm">
            Powered by NonceDuo
          </p>
        </div>
      </div>
    </div>
  );
}
