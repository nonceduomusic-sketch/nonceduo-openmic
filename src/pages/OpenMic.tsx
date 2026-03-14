import React, { useState, useMemo, useCallback } from 'react';
import { Mic2, Home, MessageCircle, Users, Music, Settings, ListMusic, Trophy, Sparkles, Monitor, ExternalLink } from 'lucide-react';
import { Song } from '@/data/songs';
import { useSongsCatalog, useFilteredSongs } from '@/hooks/useSongsCatalog';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { SongCardWithStatus } from '@/components/SongCardWithStatus';
import { SearchBar } from '@/components/SearchBar';
import { ArtistFilterDynamic } from '@/components/ArtistFilterDynamic';
import { BookingConfirmationModal } from '@/components/BookingConfirmationModal';
import { EventContextBanner } from '@/components/EventContextBanner';
import { LiveQueueDisplay } from '@/components/LiveQueueDisplay';
import { BookingStatusBanner } from '@/components/BookingStatusBanner';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useReservationStatuses } from '@/hooks/useReservationStatuses';
import { SEO } from '@/components/SEO';
import { UserLoginIndicator } from '@/components/UserLoginIndicator';
import { useStaffRole } from '@/hooks/useStaffRole';
import { useFormatActiveCheck, useGlobalFormatSettings } from '@/hooks/useGlobalFormatSettings';
import { LiveEvent } from '@/hooks/useLiveEvent';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LeaderboardCard } from '@/components/gamification/LeaderboardCard';
import { ConsecutiveUnlockListener } from '@/components/ConsecutiveUnlockListener';
import { useAssistantContext } from '@/contexts/AssistantContext';
import { useHybridBroadcast } from '@/hooks/useHybridBroadcast';
import { useSongs } from '@/hooks/useSongs';
import { toast } from 'sonner';

interface OpenMicProps {
  /**
   * When true, this page is being used inside the /app (live) experience.
   * We keep UX focused and avoid entry-points into Community.
   */
  appMode?: boolean;
  /**
   * When provided, shows the event context banner.
   */
  liveEvent?: LiveEvent | null;
}

interface OpenMicProps {
  /**
   * When true, this page is being used inside the /app (live) experience.
   * We keep UX focused and avoid entry-points into Community.
   */
  appMode?: boolean;
  /**
   * When provided, shows the event context banner.
   */
  liveEvent?: LiveEvent | null;
}

const OpenMic: React.FC<OpenMicProps> = ({ appMode = false, liveEvent }) => {
  const { isStaff } = useStaffRole();
  const [search, setSearch] = useState('');
  const [artistFilter, setArtistFilter] = useState('all');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  
  // Load songs from database
  const { songs, loading: songsLoading } = useSongsCatalog();
  
  // Load songs from DB for broadcast lookup
  const { songs: allSongsDb } = useSongs();
  
  // Broadcast hook for staff
  const { broadcastSong } = useHybridBroadcast('main');
  
  // Assistant context for triggering song request flow
  const { triggerFlow } = useAssistantContext();
  
  // Check if dediche format is active (for showing/hiding chat button)
  const { isActive: isDedicheActive } = useFormatActiveCheck('dediche');
  
  // Check if live queue should be shown to users
  const { isActive: showLiveQueue } = useFormatActiveCheck('show_live_queue');
  
  // Check if trasmetti banner should be shown
  const { isActive: showTrasmettiBanner } = useFormatActiveCheck('show_trasmetti_banner');
  
  // Use the public statuses hook for real-time updates (no auth required)
  const { isSongBooked, isSongCompleted, activeCount, loading: statusesLoading, bookedSongKeys, statuses } = useReservationStatuses();
  
  // Combined loading state
  const loading = songsLoading || statusesLoading;
  
  // State for queue visibility - closed by default
  const [showQueue, setShowQueue] = useState(false);
  
  // Handler for requesting a song via assistant
  const handleRequestSong = () => {
    triggerFlow('song_not_found', search.trim() || undefined);
  };

  // Handler for broadcasting song (staff only)
  const handleBroadcast = useCallback(async (song: Song) => {
    const songDb = allSongsDb.find(
      s => s.titolo === song.title && s.artista === song.artist
    );
    if (songDb) {
      const success = await broadcastSong(songDb.id);
      if (success) {
        toast.success('Trasmissione avviata!');
      }
    } else {
      toast.error('Canzone non trovata nel catalogo');
    }
  }, [allSongsDb, broadcastSong]);

  // Filter songs: exclude completed ones from the main list
  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const searchLower = search.toLowerCase().trim();
      
      if (!searchLower) {
        const matchesArtist = artistFilter === 'all' || song.artist === artistFilter;
        const isCompleted = isSongCompleted(song.title, song.artist);
        return matchesArtist && !isCompleted;
      }
      
      const matchesSearch =
        song.title.toLowerCase().includes(searchLower) ||
        song.artist.toLowerCase().includes(searchLower);

      const matchesArtist =
        artistFilter === 'all' || song.artist === artistFilter;

      // Hide completed songs from the list
      const isCompleted = isSongCompleted(song.title, song.artist);

      return matchesSearch && matchesArtist && !isCompleted;
    });
  }, [songs, search, artistFilter, isSongCompleted]);

  // Queue songs for display
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
    // Check if song is already booked (use latest status from hook)
    if (isSongBooked(song.title, song.artist)) {
      return; // Don't open modal for booked songs
    }
    setSelectedSong(song);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <ConsecutiveUnlockListener />
      <SEO 
        title="Open Mic | Karaoke Live by Non C'è Duo"
        description="Il karaoke live dove TU sei la star! Prenota la tua canzone e sali sul palco con la band."
        image="/og-openmic.jpg"
        url="/app/openmic"
      />
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="container py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link to="/app">
                <Button variant="ghost" size="icon" className="mr-1">
                  <Home className="w-5 h-5" />
                </Button>
              </Link>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-neon-pulse">
                <Mic2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-lg sm:text-xl md:text-2xl font-bold neon-text-pink">
                  Open Mic
                </h1>
                <p className="text-xs sm:text-sm text-secondary font-medium">
                  Non C'è Duo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!appMode && <UserLoginIndicator compact />}
              {/* Only show Chat button if dediche format is active */}
              {isDedicheActive && (
                <Link to="/app/dediche">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
                  >
                    <MessageCircle className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Chat</span>
                  </Button>
                </Link>
              )}
              {isStaff && (
                <Link to="/admin">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    title="Area Admin"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Queue indicator */}
          {activeCount > 0 && (
            <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-accent/20 border border-accent/30">
              <Users className="w-4 h-4 text-accent" />
              <span className="text-sm text-foreground">
                {activeCount === 1 
                  ? 'C\'è 1 persona in coda' 
                  : `Ci sono ${activeCount} persone in coda`}
              </span>
            </div>
          )}

          {/* Search & Filter */}
          <div className="space-y-3">
            <SearchBar value={search} onChange={setSearch} />
            <ArtistFilterDynamic value={artistFilter} onChange={setArtistFilter} songs={songs} />
          </div>

          {/* Booked count only */}
          {bookedSongKeys.size > 0 && (
            <p className="text-xs text-warning mt-3">
              {bookedSongKeys.size} canzoni prenotate
            </p>
          )}
        </div>
      </header>

      {/* Trasmetti Banner */}
      {showTrasmettiBanner && (
        <div className="container pt-4">
          <Link to="/trasmetti">
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
          </Link>
        </div>
      )}

      {/* Event Context Banner + Status */}
      {liveEvent && (
        <div className="container pt-4 space-y-3">
          <EventContextBanner event={liveEvent} />
          <BookingStatusBanner 
            event={liveEvent} 
            currentOpenMicCount={activeCount}
            format="openmic"
          />
        </div>
      )}

      {/* Live Queue Display - Collapsible */}
      {showLiveQueue && (
        <div className="container pt-4">
          <div className="rounded-xl border-2 border-secondary/30 bg-secondary/5 p-3">
            {queueSongs.length > 0 ? (
              <>
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
                  <CollapsibleContent className="mt-2">
                    <LiveQueueDisplay songs={queueSongs} />
                  </CollapsibleContent>
                </Collapsible>
                <p className="text-xs text-center text-secondary/60 mt-2">
                  👆 Queste sono le canzoni già prenotate stasera
                </p>
              </>
            ) : (
              <div className="py-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <ListMusic className="w-5 h-5 text-secondary" />
                  <span className="font-display font-bold text-secondary">Scaletta Live</span>
                </div>
                <p className="text-xs text-secondary/70 mt-1">
                  Nessuna canzone in coda al momento
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Song Catalog - Clear separation */}
      <main className="container py-4 pb-8">
        {/* Section Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Music className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-lg text-primary">Prenota la tua canzone</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Centinaia di canzoni aggiornate ogni settimana!
          </p>
        </div>

        {/* Description */}
        <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            🎤 Cerca la tua canzone preferita<br />
            👉 <strong className="text-primary">Prenota</strong> = mettiti in coda • 📄 <strong className="text-secondary">Testo</strong> = cerca le parole
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Music className="w-12 h-12 text-primary animate-pulse mx-auto mb-3" />
            <p className="text-muted-foreground">Caricamento...</p>
          </div>
        ) : (
          <>
            {/* Song grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-3">
              {filteredSongs.map((song, index) => (
                <SongCardWithStatus
                  key={`${song.title}-${song.artist}-${index}`}
                  song={song}
                  onBook={handleBookSong}
                  isBooked={isSongBooked(song.title, song.artist)}
                  isCompleted={isSongCompleted(song.title, song.artist)}
                  isStaff={isStaff}
                  onBroadcast={handleBroadcast}
                />
              ))}
            </div>

            {/* Leaderboard Section */}
            {filteredSongs.length > 0 && (
              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-warning" />
                  <h2 className="text-lg font-bold">Top Cantanti</h2>
                </div>
                <LeaderboardCard limit={5} showTitle={false} />
              </div>
            )}

            {filteredSongs.length === 0 && (
              <div className="text-center py-12">
                <Mic2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  Nessuna canzone trovata
                </p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Prova a modificare i filtri di ricerca
                </p>
                
                {/* Request song button */}
                <Button
                  onClick={handleRequestSong}
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Richiedi questa canzone
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Non la trovi? Chiedila a noi!
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Booking Modal */}
      {selectedSong && (
        <BookingConfirmationModal
          song={selectedSong}
          onClose={() => setSelectedSong(null)}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav variant="openmic" />
    </div>
  );
};

export default OpenMic;

