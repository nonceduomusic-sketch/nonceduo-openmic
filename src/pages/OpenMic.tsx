import React, { useState, useMemo } from 'react';
import { Mic2, Home, MessageCircle, Users, Music, Settings } from 'lucide-react';
import { songs, Song } from '@/data/songs';
import { SongCardWithStatus } from '@/components/SongCardWithStatus';
import { SearchBar } from '@/components/SearchBar';
import { ArtistFilter } from '@/components/ArtistFilter';
import { BookingConfirmationModal } from '@/components/BookingConfirmationModal';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useReservations } from '@/hooks/useReservations';

const OpenMic: React.FC = () => {
  const [search, setSearch] = useState('');
  const [artistFilter, setArtistFilter] = useState('all');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  
  const { activeReservations, completedReservations, loading } = useReservations();

  // Normalize text for comparison (handle different apostrophe characters)
  const normalizeText = (text: string) => {
    return text.replace(/[''`´]/g, "'").toLowerCase().trim();
  };

  const getSongKey = (title: string, artist: string) => {
    return `${normalizeText(title)}__${normalizeText(artist)}`;
  };

  // Create maps for quick lookup of booked/completed songs
  const bookedSongs = useMemo(() => {
    const set = new Set<string>();
    activeReservations.forEach(res => {
      set.add(getSongKey(res.song_title, res.song_artist));
    });
    return set;
  }, [activeReservations]);

  const completedSongs = useMemo(() => {
    const set = new Set<string>();
    completedReservations.forEach(res => {
      set.add(getSongKey(res.song_title, res.song_artist));
    });
    return set;
  }, [completedReservations]);

  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        song.title.toLowerCase().includes(searchLower) ||
        song.artist.toLowerCase().includes(searchLower);

      const matchesArtist =
        artistFilter === 'all' || song.artist === artistFilter;

      return matchesSearch && matchesArtist;
    });
  }, [search, artistFilter]);

  const isSongBooked = (song: Song) => {
    return bookedSongs.has(getSongKey(song.title, song.artist));
  };

  const isSongCompleted = (song: Song) => {
    return completedSongs.has(getSongKey(song.title, song.artist)) && !isSongBooked(song);
  };

  const handleBookSong = (song: Song) => {
    // Check if song is already booked
    if (isSongBooked(song)) {
      return; // Don't open modal for booked songs
    }
    setSelectedSong(song);
  };

  // Calculate queue position for selected song
  const queuePosition = activeReservations.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="container py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link to="/">
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
              <Link to="/messaggi">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
                >
                  <MessageCircle className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Chat</span>
                </Button>
              </Link>
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
            </div>
          </div>

          {/* Queue indicator */}
          {activeReservations.length > 0 && (
            <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-accent/20 border border-accent/30">
              <Users className="w-4 h-4 text-accent" />
              <span className="text-sm text-foreground">
                {activeReservations.length === 1 
                  ? 'C\'è 1 persona in coda' 
                  : `Ci sono ${activeReservations.length} persone in coda`}
              </span>
            </div>
          )}

          {/* Search & Filter */}
          <div className="space-y-3">
            <SearchBar value={search} onChange={setSearch} />
            <ArtistFilter value={artistFilter} onChange={setArtistFilter} />
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-muted-foreground">
              {filteredSongs.length} canzoni
            </p>
            {bookedSongs.size > 0 && (
              <p className="text-xs text-warning">
                {bookedSongs.size} prenotate
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Song List */}
      <main className="container py-4 pb-8">
        {/* Description */}
        <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border">
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            🎤 Cerca la tua canzone preferita.<br />
            👉 Clicca su <strong className="text-primary">Prenota</strong> per metterti in coda.<br />
            📄 Clicca su <strong className="text-secondary">Testo</strong> per cercare il testo online.
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
                  isBooked={isSongBooked(song)}
                  isCompleted={isSongCompleted(song)}
                />
              ))}
            </div>

            {filteredSongs.length === 0 && (
              <div className="text-center py-12">
                <Mic2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  Nessuna canzone trovata
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Prova a modificare i filtri di ricerca
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
          queuePosition={queuePosition}
        />
      )}
    </div>
  );
};

export default OpenMic;
