import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Music2, Zap, Users, ListMusic, AlertTriangle, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { songs, Song } from "@/data/songs";
import { SEO } from "@/components/SEO";
import { SearchBar } from "@/components/SearchBar";
import { ArtistFilter } from "@/components/ArtistFilter";
import { SongCardWithStatus } from "@/components/SongCardWithStatus";
import { BookingConfirmationModal } from "@/components/BookingConfirmationModal";
import { LiveQueueDisplay } from "@/components/LiveQueueDisplay";
import { useReservationStatuses } from "@/hooks/useReservationStatuses";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { FreeModeState } from "@/hooks/useLiveEvent";
import { FreeModeClosureOverlay, FreeModeClosureBanner } from "@/components/FreeModeClosureOverlay";
import { differenceInSeconds, parseISO } from "date-fns";

interface FreeModeOpenMicProps {
  freeModeState: FreeModeState;
}

/**
 * FreeModeOpenMic - Open Mic con stato Free Mode
 * 
 * Features:
 * - Limiti numerici e temporali
 * - Countdown alla scadenza
 * - Riapertura straordinaria
 * - Messaggio di chiusura configurabile
 * - Banner con nome evento dinamico
 */
export const FreeModeOpenMic: React.FC<FreeModeOpenMicProps> = ({ freeModeState }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [artistFilter, setArtistFilter] = useState("");
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showQueue, setShowQueue] = useState(false);
  const [now, setNow] = useState(new Date());
  
  const { statuses, isSongBooked, isSongCompleted } = useReservationStatuses();

  const {
    eventName,
    openmicMaxSongs,
    openmicCurrentCount,
    expiresAt,
    reopenActive,
    reopenUntil,
    reopenMessage,
    closureMode,
    closureTitle,
    closureMessage,
    closureRedirectUrl,
    closurePreviewEnabled,
  } = freeModeState;

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate if booking is closed
  const isExpired = useMemo(() => {
    if (!expiresAt) return false;
    return new Date(expiresAt) <= now;
  }, [expiresAt, now]);

  const isLimitReached = useMemo(() => {
    if (!openmicMaxSongs) return false;
    return openmicCurrentCount >= openmicMaxSongs;
  }, [openmicMaxSongs, openmicCurrentCount]);

  // Check if reopening is active and valid
  const isReopenValid = useMemo(() => {
    if (!reopenActive || !reopenUntil) return false;
    return new Date(reopenUntil) > now;
  }, [reopenActive, reopenUntil, now]);

  // Is booking closed? (also respects admin preview mode)
  const isClosed = closurePreviewEnabled || ((isExpired || isLimitReached) && !isReopenValid);

  // Handle redirect mode
  useEffect(() => {
    if (isClosed && closureMode === 'redirect') {
      if (closureRedirectUrl) {
        window.location.href = closureRedirectUrl;
      } else {
        // Redirect to info page with closure context
        navigate('/openmic');
      }
    }
  }, [isClosed, closureMode, closureRedirectUrl, navigate]);

  // Calculate remaining time
  const remainingTime = useMemo(() => {
    if (!expiresAt || isExpired) return null;
    const seconds = differenceInSeconds(parseISO(expiresAt), now);
    if (seconds <= 0) return null;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return { minutes, seconds: secs, total: seconds };
  }, [expiresAt, now, isExpired]);

  // Calculate reopen remaining time
  const reopenRemaining = useMemo(() => {
    if (!reopenUntil || !isReopenValid) return null;
    const seconds = differenceInSeconds(parseISO(reopenUntil), now);
    if (seconds <= 0) return null;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return { minutes, seconds: secs };
  }, [reopenUntil, now, isReopenValid]);

  // Filter songs based on search and artist
  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      const matchesSearch = !search || 
        song.title.toLowerCase().includes(search.toLowerCase()) ||
        song.artist.toLowerCase().includes(search.toLowerCase());
      
      const matchesArtist = !artistFilter || artistFilter === 'all' || song.artist === artistFilter;
      
      // Hide completed songs
      const isCompleted = isSongCompleted(song.title, song.artist);
      
      return matchesSearch && matchesArtist && !isCompleted;
    });
  }, [search, artistFilter, isSongCompleted]);

  // Build queue from in_progress reservations
  const queueSongs = useMemo(() => {
    return statuses
      .filter(s => s.status === 'in_progress')
      .map(s => ({
        id: s.reservation_id,
        song_key: s.song_key,
        song_title: s.song_title,
        song_artist: s.song_artist,
        status: s.status,
        created_at: s.created_at,
      }));
  }, [statuses]);

  const handleBookSong = (song: Song) => {
    if (isSongBooked(song.title, song.artist) || isClosed) {
      return; // Already booked or closed
    }
    setSelectedSong(song);
  };

  const bookedCount = statuses.filter(s => s.status === 'in_progress').length;
  const remaining = openmicMaxSongs ? openmicMaxSongs - openmicCurrentCount : null;

  return (
    <>
      <SEO 
        title={`Open Mic - ${eventName || 'Evento Live'} | Non Ce Duo`}
        description="Prenota la tua canzone per il karaoke live!"
      />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <Link to="/app" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm hidden sm:inline">App</span>
              </Link>
              
              <h1 className="font-display text-lg font-bold flex items-center gap-2">
                <Music2 className="w-5 h-5 text-primary" />
                Open Mic
              </h1>
              
              <Button
                variant="ghost"
                size="sm"
                className="relative"
                onClick={() => setShowQueue(!showQueue)}
              >
                <Users className="w-4 h-4" />
                {bookedCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {bookedCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-4 pb-24 space-y-4">
          {/* Closure Overlay - blocks all content when closed */}
          {isClosed ? (
            <FreeModeClosureOverlay
              closureTitle={closureTitle || 'Prenotazioni chiuse'}
              closureMessage={closureMessage || (isLimitReached 
                ? 'Abbiamo raggiunto il numero massimo di prenotazioni per questa serata. Grazie per la comprensione!' 
                : 'Il tempo per prenotare è scaduto. Grazie per aver partecipato!')}
            />
          ) : (
            <div className={cn(
              "relative overflow-hidden rounded-xl p-4",
              "bg-gradient-to-br from-accent/20 via-accent/10 to-secondary/10",
              "border border-accent/30",
              isReopenValid && "ring-2 ring-secondary/50"
            )}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-accent/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    {eventName || 'Evento Live'}
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
                    </span>
                  </h2>
                  
                  {/* Status info */}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {remaining !== null && (
                      <Badge variant={remaining <= 3 ? "destructive" : "secondary"} className="text-xs">
                        {remaining} posti rimasti
                      </Badge>
                    )}
                    {remainingTime && (
                      <Badge variant={remainingTime.total <= 300 ? "destructive" : "outline"} className="text-xs flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        {remainingTime.minutes}m {remainingTime.seconds}s
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Reopen banner - VERY VISIBLE */}
              {isReopenValid && (
                <div className="mt-3 pt-3 border-t-2 border-secondary/50 animate-pulse">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 border border-secondary/40">
                    <div className="p-2 rounded-full bg-secondary/30">
                      <AlertTriangle className="w-5 h-5 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-secondary">
                        🎉 {reopenMessage || 'Riapertura straordinaria!'}
                      </p>
                      <p className="text-xs text-secondary/80">
                        Affrettati! Posti extra disponibili per poco tempo
                      </p>
                    </div>
                    {reopenRemaining && (
                      <Badge variant="secondary" className="text-sm font-bold animate-bounce">
                        ⏱️ {reopenRemaining.minutes}:{reopenRemaining.seconds.toString().padStart(2, '0')}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Don't show content if closed */}
          {isClosed ? null : (
            <>
              {/* Search and Filter */}
              <div className="space-y-3">
                <SearchBar 
                  value={search}
                  onChange={setSearch}
                  placeholder="Cerca canzone o artista..."
                />
                <ArtistFilter
                  value={artistFilter}
                  onChange={setArtistFilter}
                />
              </div>

              {/* Queue Display - Collapsible */}
              {queueSongs.length > 0 && (
                <div className="rounded-xl border-2 border-secondary/30 bg-secondary/5 p-3">
                  <Collapsible open={showQueue} onOpenChange={setShowQueue}>
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full flex items-center justify-between p-3 h-auto bg-secondary/10 hover:bg-secondary/20 rounded-lg border border-secondary/30"
                      >
                        <div className="flex items-center gap-2">
                          <ListMusic className="w-5 h-5 text-secondary" />
                          <span className="font-display font-bold text-secondary">Scaletta Live</span>
                          <span className="text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">
                            {queueSongs.length} in coda
                          </span>
                        </div>
                        <span className="text-xs text-secondary/70">
                          {showQueue ? '▲ Chiudi' : '▼ Vedi chi canta'}
                        </span>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-3">
                        <LiveQueueDisplay songs={queueSongs} />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Music2 className="w-4 h-4" />
                  {filteredSongs.length} canzoni
                </span>
                {bookedCount > 0 && (
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {bookedCount} in coda
                  </span>
                )}
              </div>

              {/* Song Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredSongs.map((song) => (
                  <SongCardWithStatus
                    key={`${song.title}-${song.artist}`}
                    song={song}
                    isBooked={isSongBooked(song.title, song.artist)}
                    isCompleted={isSongCompleted(song.title, song.artist)}
                    onBook={handleBookSong}
                  />
                ))}
              </div>

              {filteredSongs.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Music2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nessuna canzone trovata</p>
                  <p className="text-sm mt-1">Prova a modificare la ricerca</p>
                </div>
              )}
            </>
          )}
        </main>

        {/* Booking Modal */}
        {selectedSong && !isClosed && (
          <BookingConfirmationModal
            song={selectedSong}
            onClose={() => setSelectedSong(null)}
          />
        )}
      </div>
    </>
  );
};

export default FreeModeOpenMic;
