import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Music2, Zap, Users, ListMusic, AlertTriangle, Timer, Monitor, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Song } from "@/data/songs";
import { useSongsCatalog } from "@/hooks/useSongsCatalog";
import { SEO } from "@/components/SEO";
import { SearchBar } from "@/components/SearchBar";
import { ArtistFilterDynamic } from "@/components/ArtistFilterDynamic";
import { SongCardWithStatus } from "@/components/SongCardWithStatus";
import { BookingConfirmationModal } from "@/components/BookingConfirmationModal";
import { LiveQueueDisplay } from "@/components/LiveQueueDisplay";
import { useReservationStatuses } from "@/hooks/useReservationStatuses";
import { useFormatActiveCheck } from "@/hooks/useGlobalFormatSettings";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { FreeModeState } from "@/hooks/useLiveEvent";
import { FreeModeClosureOverlay, FreeModeClosureBanner } from "@/components/FreeModeClosureOverlay";
import { EventCountdownBanner } from "@/components/effects/EventCountdownBanner";
import { differenceInSeconds, parseISO } from "date-fns";
import { ConsecutiveUnlockListener } from '@/components/ConsecutiveUnlockListener';
import { useStaffRole } from "@/hooks/useStaffRole";
import { useHybridBroadcast } from "@/hooks/useHybridBroadcast";
import { useSongs } from "@/hooks/useSongs";
import { toast } from "sonner";

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
  const [artistFilter, setArtistFilter] = useState("all");
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showQueue, setShowQueue] = useState(false);
  const [now, setNow] = useState(new Date());
  
  // Load songs from database
  const { songs, loading: songsLoading } = useSongsCatalog();
  
  const { statuses, isSongBooked, isSongCompleted } = useReservationStatuses();
  const { isStaff } = useStaffRole();
  const { broadcastSong, stopBroadcast, session: broadcastSession } = useHybridBroadcast('main');
  const currentBroadcastSongId = broadcastSession?.current_song_id || null;
  const { songs: dbSongs } = useSongs();

  const handleBroadcast = useCallback((song: Song) => {
    const songDb = dbSongs.find(
      s => s.titolo?.toLowerCase() === song.title.toLowerCase() &&
           s.artista?.toLowerCase() === song.artist.toLowerCase()
    );
    if (!songDb) {
      toast.error('Canzone non trovata nel database');
      return;
    }
    if (currentBroadcastSongId === songDb.id) {
      stopBroadcast();
      toast.success('Trasmissione interrotta');
    } else {
      broadcastSong(songDb.id);
      toast.success(`Trasmissione: ${song.title}`);
    }
  }, [dbSongs, broadcastSong, stopBroadcast, currentBroadcastSongId]);

  const openTrasmettiInNewTab = useCallback(() => {
    const trasmettiUrl = `${window.location.origin}/trasmetti`;
    const newWindow = window.open(trasmettiUrl, '_blank', 'noopener,noreferrer');

    if (newWindow) {
      newWindow.opener = null;
      return;
    }

    toast.error('Il browser ha bloccato la nuova scheda. Riprova tenendo premuto sul banner.');
  }, []);

        {/* Trasmetti Banner */}
        {showTrasmettiBanner && (
          <div className="container mx-auto px-4 pt-2">
            <button
              type="button"
              onClick={openTrasmettiInNewTab}
              className="block w-full text-left"
              aria-label="Apri Trasmetti in una nuova scheda"
            >
              <div className="relative overflow-hidden rounded-xl p-3 bg-gradient-to-r from-indigo-500/20 via-indigo-500/10 to-purple-500/10 border border-indigo-500/30 hover:border-indigo-500/50 transition-all group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                    <Monitor className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">📺 Segui i testi dal vivo!</p>
                    <p className="text-xs text-muted-foreground">Apri Trasmetti per vedere i testi che scorrono sul tuo schermo</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </div>
              </div>
            </button>
          </div>
        )}

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
                  </div>
                </div>
              </div>

              {/* Countdown alla chiusura - Banner prominente (solo se end_mode non è manual) */}
              {expiresAt && !isClosed && endMode !== 'manual' && (
                <EventCountdownBanner
                  type="end"
                  targetTime={expiresAt}
                  showMinutesBefore={countdownEndShowMinutes}
                  label="Prenotazioni chiudono tra"
                  animated
                  className="mt-3"
                />
              )}

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
                <ArtistFilterDynamic
                  value={artistFilter}
                  onChange={setArtistFilter}
                  songs={songs}
                />
              </div>

              {/* Queue Display - Collapsible */}
              {showLiveQueue && queueSongs.length > 0 && (
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
                  Centinaia di canzoni aggiornate ogni settimana!
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
                {filteredSongs.map((song) => {
                  const songDb = dbSongs.find(s => s.titolo?.toLowerCase() === song.title.toLowerCase() && s.artista?.toLowerCase() === song.artist.toLowerCase());
                  return (
                    <SongCardWithStatus
                      key={`${song.title}-${song.artist}`}
                      song={song}
                      isBooked={isSongBooked(song.title, song.artist)}
                      isCompleted={isSongCompleted(song.title, song.artist)}
                      onBook={handleBookSong}
                    />
                  );
                })}
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

