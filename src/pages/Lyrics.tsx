import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Home, Music2, Plus, Minus, ChevronUp, ChevronDown, Play, Pause, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
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
const AUTO_SCROLL_SPEED_KEY = 'lyrics-auto-scroll-speed';

// Lines per highlight chunk
const LINES_PER_CHUNK = 3;

// Auto-scroll speeds (pixels per second)
const MIN_SCROLL_SPEED = 10;
const MAX_SCROLL_SPEED = 80;
const DEFAULT_SCROLL_SPEED = 30;

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
  const { isActive: autoScrollEnabled } = useFormatActiveCheck('lyrics_auto_scroll');

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

  // Auto-scroll state
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(AUTO_SCROLL_SPEED_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (parsed >= MIN_SCROLL_SPEED && parsed <= MAX_SCROLL_SPEED) return parsed;
      }
    } catch {}
    return DEFAULT_SCROLL_SPEED;
  });
  const [showSpeedSlider, setShowSpeedSlider] = useState(false);
  const scrollAnimationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Highlight state - now tracks chunk index
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(-1);
  const chunkRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Normalize and split lyrics into lines, handling various newline formats
  const normalizeLyrics = (text: string | null | undefined): string[] => {
    if (!text) return [];
    // Handle escaped newlines, Windows CRLF, and Unix LF
    return text
      .replace(/\\n/g, '\n')      // escaped \n
      .replace(/\r\n/g, '\n')     // Windows CRLF
      .replace(/\r/g, '\n')       // old Mac CR
      .split('\n');
  };

  const lyricsLines = normalizeLyrics(song?.testo);
  
  // Group lines into chunks of LINES_PER_CHUNK
  const lyricsChunks = React.useMemo(() => {
    const chunks: string[][] = [];
    for (let i = 0; i < lyricsLines.length; i += LINES_PER_CHUNK) {
      chunks.push(lyricsLines.slice(i, i + LINES_PER_CHUNK));
    }
    return chunks;
  }, [lyricsLines]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

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

  // Persist scroll speed
  useEffect(() => {
    try {
      localStorage.setItem(AUTO_SCROLL_SPEED_KEY, scrollSpeed.toString());
    } catch {}
  }, [scrollSpeed]);

  // Auto-scroll animation
  useEffect(() => {
    if (!isAutoScrolling) {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
        scrollAnimationRef.current = null;
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 1000; // Convert to seconds
      lastTimeRef.current = timestamp;

      window.scrollBy(0, scrollSpeed * delta);

      // Check if we've reached the bottom
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (window.scrollY >= maxScroll - 10) {
        setIsAutoScrolling(false);
        return;
      }

      scrollAnimationRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = 0;
    scrollAnimationRef.current = requestAnimationFrame(animate);

    return () => {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
    };
  }, [isAutoScrolling, scrollSpeed]);

  // Scroll to highlighted chunk (and stop auto-scroll if using manual navigation)
  useEffect(() => {
    if (currentChunkIndex >= 0 && chunkRefs.current[currentChunkIndex]) {
      chunkRefs.current[currentChunkIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentChunkIndex]);

  const toggleAutoScroll = useCallback(() => {
    setIsAutoScrolling(prev => !prev);
    setShowSpeedSlider(false);
  }, []);

  const handleSpeedChange = useCallback((value: number[]) => {
    setScrollSpeed(value[0]);
  }, []);

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

  const handleChunkUp = useCallback(() => {
    setIsAutoScrolling(false); // Stop auto-scroll on manual navigation
    setCurrentChunkIndex((prev) => Math.max(-1, prev - 1));
  }, []);

  const handleChunkDown = useCallback(() => {
    setIsAutoScrolling(false); // Stop auto-scroll on manual navigation
    setCurrentChunkIndex((prev) => Math.min(lyricsChunks.length - 1, prev + 1));
  }, [lyricsChunks.length]);

  const backgroundColor = id ? getColorForSong(id) : BACKGROUND_COLORS[0];
  const showControls = zoomEnabled || highlightEnabled || autoScrollEnabled;

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
        {/* Extra padding on mobile for bottom bar */}
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-2xl mb-24 pb-24 sm:pb-8">
          {song.testo ? (
            <div
              className="font-sans leading-relaxed text-white"
              style={{ fontSize: `${fontSize}px` }}
            >
              {lyricsChunks.map((chunk, chunkIndex) => (
                <div
                  key={chunkIndex}
                  ref={(el) => (chunkRefs.current[chunkIndex] = el)}
                  className={cn(
                    'py-2 px-3 -mx-3 rounded-lg transition-all duration-300 mb-2',
                    currentChunkIndex === chunkIndex && highlightEnabled
                      ? 'bg-yellow-400/30 ring-2 ring-yellow-400/50 scale-[1.01]'
                      : ''
                  )}
                >
                  {chunk.map((line, lineIndex) => (
                    <div key={lineIndex} className="py-0.5">
                      {line || '\u00A0'}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Music2 className="w-12 h-12 text-white/50 mx-auto mb-4" />
              <p className="text-white/70 text-lg mb-2">
                Testo in arrivo per questa canzone! 🎶
              </p>
              <p className="text-white/50 text-sm">
                Stiamo lavorando per aggiungere il testo. Torna a trovarci presto!
              </p>
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

      {/* Floating Control Buttons - Bottom bar on mobile, side panel on desktop */}
      {showControls && song.testo && (
        <>
          {/* Mobile: Bottom horizontal bar */}
          <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
            <div className="bg-black/80 backdrop-blur-md border-t border-white/20 px-4 py-3 safe-area-bottom">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {/* Auto-scroll controls */}
                {autoScrollEnabled && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleAutoScroll}
                      className={cn(
                        "text-white hover:bg-white/20 h-10 w-10",
                        isAutoScrolling && "bg-green-500/30 text-green-400"
                      )}
                      title={isAutoScrolling ? "Ferma scorrimento" : "Avvia scorrimento automatico"}
                    >
                      {isAutoScrolling ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSpeedSlider(!showSpeedSlider)}
                      className={cn(
                        "text-white hover:bg-white/20 h-10 w-10",
                        showSpeedSlider && "bg-white/20"
                      )}
                      title="Regola velocità"
                    >
                      <Gauge className="w-5 h-5" />
                    </Button>
                  </>
                )}
                
                {/* Zoom controls */}
                {zoomEnabled && (
                  <>
                    {autoScrollEnabled && <div className="w-px h-8 bg-white/20" />}
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
                  </>
                )}
                
                {/* Highlight navigation */}
                {highlightEnabled && (
                  <>
                    {(zoomEnabled || autoScrollEnabled) && <div className="w-px h-8 bg-white/20" />}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleChunkUp}
                      disabled={currentChunkIndex < 0}
                      className="text-white hover:bg-white/20 h-10 w-10"
                      title="Blocco precedente"
                    >
                      <ChevronUp className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleChunkDown}
                      disabled={currentChunkIndex >= lyricsChunks.length - 1}
                      className="text-white hover:bg-white/20 h-10 w-10"
                      title="Blocco successivo"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </Button>
                  </>
                )}
              </div>
              
              {/* Speed Slider - shows above the bar when active */}
              {autoScrollEnabled && showSpeedSlider && (
                <div className="mt-2 flex items-center justify-center gap-3">
                  <Gauge className="w-4 h-4 text-white/70" />
                  <Slider
                    value={[scrollSpeed]}
                    onValueChange={handleSpeedChange}
                    min={MIN_SCROLL_SPEED}
                    max={MAX_SCROLL_SPEED}
                    step={5}
                    className="w-40"
                  />
                  <span className="text-white/70 text-xs font-mono w-8">{scrollSpeed}</span>
                </div>
              )}
            </div>
          </div>

          {/* Desktop: Side panel (original behavior) */}
          <div className="hidden sm:flex fixed bottom-6 right-6 z-50 flex-col gap-2 items-end">
            {/* Speed Slider - shows when clicking settings */}
            {autoScrollEnabled && showSpeedSlider && (
              <div className="bg-black/80 backdrop-blur-md rounded-xl p-3 shadow-2xl border border-white/20 flex items-center gap-3 animate-fade-in">
                <Gauge className="w-4 h-4 text-white/70" />
                <Slider
                  value={[scrollSpeed]}
                  onValueChange={handleSpeedChange}
                  min={MIN_SCROLL_SPEED}
                  max={MAX_SCROLL_SPEED}
                  step={5}
                  className="w-32"
                />
                <span className="text-white/70 text-xs font-mono w-8">{scrollSpeed}</span>
              </div>
            )}
            
            <div className="bg-black/60 backdrop-blur-md rounded-xl p-2 shadow-2xl border border-white/20 flex flex-col gap-1">
              {/* Auto-scroll controls */}
              {autoScrollEnabled && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleAutoScroll}
                    className={cn(
                      "text-white hover:bg-white/20 h-10 w-10",
                      isAutoScrolling && "bg-green-500/30 text-green-400"
                    )}
                    title={isAutoScrolling ? "Ferma scorrimento" : "Avvia scorrimento automatico"}
                  >
                    {isAutoScrolling ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSpeedSlider(!showSpeedSlider)}
                    className={cn(
                      "text-white hover:bg-white/20 h-10 w-10",
                      showSpeedSlider && "bg-white/20"
                    )}
                    title="Regola velocità"
                  >
                    <Gauge className="w-5 h-5" />
                  </Button>
                </>
              )}
              
              {/* Zoom controls */}
              {zoomEnabled && (
                <>
                  {autoScrollEnabled && <div className="h-px bg-white/20 my-1" />}
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
              
              {/* Highlight navigation */}
              {highlightEnabled && (
                <>
                  {(zoomEnabled || autoScrollEnabled) && <div className="h-px bg-white/20 my-1" />}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleChunkUp}
                    disabled={currentChunkIndex < 0}
                    className="text-white hover:bg-white/20 h-10 w-10"
                    title="Blocco precedente"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleChunkDown}
                    disabled={currentChunkIndex >= lyricsChunks.length - 1}
                    className="text-white hover:bg-white/20 h-10 w-10"
                    title="Blocco successivo"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Bottom Gradient Fade */}
      <div className="h-24 bg-gradient-to-t from-black/50 to-transparent" />
    </div>
  );
};

export default Lyrics;