import React, { useState, useMemo } from 'react';
import { Mic2, Settings, Home, ArrowLeft } from 'lucide-react';
import { songs, Song } from '@/data/songs';
import { SongCard } from '@/components/SongCard';
import { SearchBar } from '@/components/SearchBar';
import { ArtistFilter } from '@/components/ArtistFilter';
import { BookingModal } from '@/components/BookingModal';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const OpenMic: React.FC = () => {
  const [search, setSearch] = useState('');
  const [artistFilter, setArtistFilter] = useState('all');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="container py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="ghost" size="icon" className="mr-2">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-neon-pulse">
                <Mic2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-xl md:text-2xl font-bold neon-text-pink">
                  Non C'è Duo
                </h1>
                <p className="text-xs md:text-sm text-secondary font-medium">
                  Open Mic
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/">
                <Button variant="ghost" size="icon" title="Torna al sito">
                  <Home className="w-5 h-5 text-muted-foreground" />
                </Button>
              </Link>
              <Link
                to="/admin"
                className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                title="Admin"
              >
                <Settings className="w-5 h-5 text-muted-foreground" />
              </Link>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="space-y-3">
            <SearchBar value={search} onChange={setSearch} />
            <ArtistFilter value={artistFilter} onChange={setArtistFilter} />
          </div>

          {/* Results count */}
          <p className="text-xs text-muted-foreground mt-3">
            {filteredSongs.length} canzoni trovate
          </p>
        </div>
      </header>

      {/* Song List */}
      <main className="container py-4 pb-8">
        {/* Description */}
        <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border">
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            🎤 Cerca la tua canzone preferita.<br />
            👉 Clicca su <strong className="text-primary">Prenota</strong> per inviarci la richiesta su WhatsApp.<br />
            📄 Clicca su <strong className="text-secondary">Testo</strong> per aprire il testo della canzone online.
          </p>
        </div>

        {/* Mobile: 1 col, Tablet: 2 cols with better spacing, Desktop: 3 cols */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-3">
          {filteredSongs.map((song, index) => (
            <SongCard
              key={`${song.title}-${song.artist}-${index}`}
              song={song}
              onBook={setSelectedSong}
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
      </main>

      {/* Booking Modal */}
      {selectedSong && (
        <BookingModal
          song={selectedSong}
          onClose={() => setSelectedSong(null)}
        />
      )}
    </div>
  );
};

export default OpenMic;
