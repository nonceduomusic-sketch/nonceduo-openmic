import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Music2, Zap, Search as SearchIcon, Users } from "lucide-react";
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
import { cn } from "@/lib/utils";

/**
 * FreeModeOpenMic - Open Mic senza limiti (Evento Live)
 * 
 * Features:
 * - Nessun limite numerico
 * - Nessun countdown
 * - Banner "Evento Live" distintivo
 * - Tutte le funzionalità base di prenotazione
 */
export const FreeModeOpenMic: React.FC = () => {
  const [search, setSearch] = useState("");
  const [artistFilter, setArtistFilter] = useState("");
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showQueue, setShowQueue] = useState(false);
  
  const { statuses, isSongBooked, isSongCompleted } = useReservationStatuses();

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
    if (isSongBooked(song.title, song.artist)) {
      return; // Already booked
    }
    setSelectedSong(song);
  };

  const bookedCount = statuses.filter(s => s.status === 'in_progress').length;

  return (
    <>
      <SEO 
        title="Open Mic - Evento Live | Non Ce Duo"
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
          {/* Free Mode Banner */}
          <div className={cn(
            "relative overflow-hidden rounded-xl p-4",
            "bg-gradient-to-br from-accent/20 via-accent/10 to-secondary/10",
            "border border-accent/30",
          )}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-accent/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                  Evento Live
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
                  </span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Prenota liberamente senza limiti! 🎤
                </p>
              </div>
            </div>
          </div>

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

          {/* Queue Display */}
          {showQueue && queueSongs.length > 0 && (
            <LiveQueueDisplay songs={queueSongs} />
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <SearchIcon className="w-4 h-4" />
              {filteredSongs.length} canzoni
            </span>
            {bookedCount > 0 && (
              <span className="flex items-center gap-1.5">
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
        </main>

        {/* Booking Modal */}
        {selectedSong && (
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
