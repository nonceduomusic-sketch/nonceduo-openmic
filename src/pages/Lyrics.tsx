import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Home, Music2, ExternalLink, Plus, Minus, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSongs, Song } from '@/hooks/useSongs';
import { useFormatActiveCheck } from '@/hooks/useGlobalFormatSettings';
import { cn } from '@/lib/utils';

// Vibrant color palette for backgrounds (Spotify-like)
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

// Font size levels for zoom
const FONT_SIZES = [16, 20, 24, 28, 32];
const DEFAULT_FONT_SIZE = 20;
const FONT_SIZE_STORAGE_KEY = 'lyrics-font-size';

// Generate a consistent color based on song ID
const getColorForSong = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % BACKGROUND_COLORS.length;
  return BACKGROUND_COLORS[index];
};

const Lyrics: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSongById } = useSongs();
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Admin settings
  const { isActive: zoomEnabled } = useFormatActiveCheck('lyrics_zoom');
  const { isActive: highlightEnabled } = useFormatActiveCheck('lyrics_highlight_arrows');

  // Zoom state (persisted per device)
  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (FONT_SIZES.includes(parsed)) return parsed;
      }
    } catch {}
    return DEFAULT_FONT_SIZE;
  });

  // Highlight state
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Split lyrics into lines
  const lyricsLines = song?.testo?.split('\n') || [];

  useEffect(() => {
    const loadSong = async () => {
      if (!id) {
        setError(true);
        setLoading(false);
        return;
      }

      const fetchedSong = await getSongById(id);
      if (fetchedSong) {
        setSong(fetchedSong);
      } else {
        setError(true);
      }
      setLoading(false);
    };

    loadSong();
  }, [id, getSongById]);

  // Persist font size
  useEffect(() => {
    try {
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize.toString());
    } catch {}
  }, [fontSize]);

  // Scroll to highlighted line
  useEffect(() => {
    if (currentLineIndex >= 0 && lineRefs.current[currentLineIndex]) {
      lineRefs.current[currentLineIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentLineIndex]);

  const handleZoomIn = useCallback(() => {
    setFontSize((prev) => {
      const currentIndex = FONT_SIZES.indexOf(prev);
      if (currentIndex < FONT_SIZES.length - 1) {
        return FONT_SIZES[currentIndex + 1];
      }
      return prev;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setFontSize((prev) => {
      const currentIndex = FONT_SIZES.indexOf(prev);
      if (currentIndex > 0) {
        return FONT_SIZES[currentIndex - 1];
      }
      return prev;
    });
  }, []);

  const handleLineUp = useCallback(() => {
    setCurrentLineIndex((prev) => Math.max(-1, prev - 1));
  }, []);

  const handleLineDown = useCallback(() => {
    setCurrentLineIndex((prev) => Math.min(lyricsLines.length - 1, prev + 1));
  }, [lyricsLines.length]);

  const backgroundColor = id ? getColorForSong(id) : BACKGROUND_COLORS[0];

  if (loading) {
    return (
      <div className={cn('min-h-screen bg-gradient-to-b', backgroundColor)}>
        <div className="container max-w-3xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-32 mb-8 bg-white/20" />
          <Skeleton className="h-12 w-3/4 mb-4 bg-white/20" />
          <Skeleton className="h-6 w-1/2 mb-12 bg-white/20" />
          <div className="space-y-3">
            {[...Array(20)].map((_, i) => (
              <Skeleton key={i} className="h-5 w-full bg-white/10" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-950 flex items-center justify-center">
        <div className="text-center px-4">
          <Music2 className="w-16 h-16 text-white/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Canzone non trovata</h1>
          <p className="text-white/70 mb-6">
            Il testo richiesto non è disponibile nel nostro catalogo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="border-white/30 text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Indietro
            </Button>
            <Button
              asChild
              className="bg-white text-gray-900 hover:bg-white/90"
            >
              <Link to="/app/openmic">
                <Music2 className="w-4 h-4 mr-2" />
                Torna a Open Mic
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const showControls = zoomEnabled || highlightEnabled;

  return (
    <div className={cn('min-h-screen bg-gradient-to-b', backgroundColor)}>
      {/* Top Navigation */}
      <div className="sticky top-0 z-50 backdrop-blur-lg bg-black/20">
        <div className="container max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Indietro
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-white hover:bg-white/10"
              >
                <Link to="/app/openmic">
                  <Music2 className="w-4 h-4 mr-2" />
                  Open Mic
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-white hover:bg-white/10"
              >
                <Link to="/">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Song Header */}
      <div className="container max-w-3xl mx-auto px-4 pt-8 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
            {song.titolo}
          </h1>
          <p className="text-xl sm:text-2xl text-white/80 font-medium">
            {song.artista}
          </p>
        </div>

        {/* Lyrics Content */}
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-2xl mb-24">
          {song.testo ? (
            <div
              className="whitespace-pre-wrap font-sans leading-relaxed text-white"
              style={{ fontSize: `${fontSize}px` }}
            >
              {lyricsLines.map((line, index) => (
                <span
                  key={index}
                  ref={(el) => (lineRefs.current[index] = el)}
                  className={cn(
                    'block py-1 px-2 -mx-2 rounded transition-all duration-300',
                    currentLineIndex === index && highlightEnabled
                      ? 'bg-yellow-400/40 font-bold scale-[1.02]'
                      : ''
                  )}
                >
                  {line || '\u00A0'}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Music2 className="w-12 h-12 text-white/50 mx-auto mb-4" />
              <p className="text-white/70 text-lg">
                Testo non ancora disponibile per questa canzone.
              </p>
              <Button
                variant="outline"
                asChild
                className="mt-4 border-white/30 text-white hover:bg-white/10"
              >
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(song.titolo + ' ' + song.artista + ' testo')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Cerca su Google
                </a>
              </Button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="border-white/30 text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna Indietro
          </Button>
          <Button
            asChild
            className="bg-white text-gray-900 hover:bg-white/90"
          >
            <Link to="/app/openmic">
              <Music2 className="w-4 h-4 mr-2" />
              Torna a Open Mic
            </Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="border-white/30 text-white hover:bg-white/10"
          >
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Sito Principale
            </Link>
          </Button>
        </div>
      </div>

      {/* Floating Control Buttons */}
      {showControls && song.testo && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
          <div className="bg-black/60 backdrop-blur-md rounded-xl p-2 shadow-2xl border border-white/20 flex flex-col gap-1">
            {zoomEnabled && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={fontSize >= FONT_SIZES[FONT_SIZES.length - 1]}
                  className="text-white hover:bg-white/20 h-10 w-10"
                  title="Ingrandisci testo"
                >
                  <Plus className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={fontSize <= FONT_SIZES[0]}
                  className="text-white hover:bg-white/20 h-10 w-10"
                  title="Riduci testo"
                >
                  <Minus className="w-5 h-5" />
                </Button>
              </>
            )}
            {highlightEnabled && (
              <>
                {zoomEnabled && <div className="h-px bg-white/20 my-1" />}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLineUp}
                  disabled={currentLineIndex < 0}
                  className="text-white hover:bg-white/20 h-10 w-10"
                  title="Riga precedente"
                >
                  <ChevronUp className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLineDown}
                  disabled={currentLineIndex >= lyricsLines.length - 1}
                  className="text-white hover:bg-white/20 h-10 w-10"
                  title="Riga successiva"
                >
                  <ChevronDown className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bottom Gradient Fade */}
      <div className="h-24 bg-gradient-to-t from-black/50 to-transparent" />
    </div>
  );
};

export default Lyrics;