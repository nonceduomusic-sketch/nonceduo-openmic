import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Mic2, Home, Music, Eye, Lock, Search, ChevronLeft } from 'lucide-react';
import { songs, Song } from '@/data/songs';
import { SearchBar } from '@/components/SearchBar';
import { ArtistFilter } from '@/components/ArtistFilter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SEO } from '@/components/SEO';
import { LyricsDialog } from '@/components/LyricsDialog';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { cn } from '@/lib/utils';

interface ConsultableOpenMicProps {
  eventName?: string;
  /**
   * Se true, nasconde i testi fino a quando l'evento non è live
   */
  protectRepertoire?: boolean;
  /**
   * Messaggio opzionale da mostrare
   */
  message?: string;
}

/**
 * ConsultableOpenMic - Versione "teaser" del catalogo Open Mic
 * 
 * Permette agli utenti di:
 * - Sfogliare titoli e artisti
 * - Vedere quante canzoni sono disponibili
 * - NON prenotare (bottone disabilitato)
 * - Vedere i testi SOLO se protectRepertoire è false
 * 
 * Utile per:
 * - Promozione pre-evento
 * - Quando il format è "spento" ma vuoi dare un assaggio
 */
export const ConsultableOpenMic: React.FC<ConsultableOpenMicProps> = ({
  eventName = 'Open Mic',
  protectRepertoire = true,
  message,
}) => {
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

  // Get unique artists count
  const uniqueArtists = useMemo(() => {
    return new Set(songs.map(s => s.artist)).size;
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SEO 
        title={`${eventName} | Anteprima Catalogo`}
        description="Scopri le canzoni disponibili per l'Open Mic! Sfoglia il catalogo e preparati a cantare."
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
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary/50 to-secondary/50 flex items-center justify-center">
                <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-lg sm:text-xl md:text-2xl font-bold text-muted-foreground">
                  {eventName}
                </h1>
                <p className="text-xs sm:text-sm text-secondary font-medium flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Modalità Anteprima
                </p>
              </div>
            </div>

            <Badge variant="secondary" className="bg-muted text-muted-foreground">
              Solo consultazione
            </Badge>
          </div>

          {/* Info Banner */}
          <div className="mb-4 p-3 rounded-lg bg-secondary/10 border border-secondary/30">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-secondary" />
              <span className="font-medium text-secondary text-sm">Prenotazioni non disponibili</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {message || 'Sfoglia il catalogo per scoprire le canzoni disponibili. Le prenotazioni si apriranno quando l\'evento sarà attivo.'}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Music className="w-4 h-4 text-primary" />
              <span><strong className="text-foreground">{songs.length}</strong> canzoni</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mic2 className="w-4 h-4 text-secondary" />
              <span><strong className="text-foreground">{uniqueArtists}</strong> artisti</span>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="space-y-3">
            <SearchBar value={search} onChange={setSearch} />
            <ArtistFilter value={artistFilter} onChange={setArtistFilter} />
          </div>
        </div>
      </header>

      {/* Song Catalog */}
      <main className="container py-4 pb-8">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            {filteredSongs.length === songs.length 
              ? `Mostrando tutte le ${songs.length} canzoni`
              : `${filteredSongs.length} risultati`}
          </p>
        </div>

        {/* Song grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredSongs.map((song, index) => (
            <Card 
              key={`${song.title}-${song.artist}-${index}`}
              className="glass-card hover:border-border/60 transition-all"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-bold text-foreground truncate">
                      {song.title}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {song.artist}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {/* Lyrics button - disabled if protected */}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={protectRepertoire}
                      onClick={() => !protectRepertoire && setSelectedSong(song)}
                      className={cn(
                        "text-xs",
                        protectRepertoire && "opacity-50 cursor-not-allowed"
                      )}
                      title={protectRepertoire ? "Testi disponibili solo durante l'evento" : "Vedi testo"}
                    >
                      {protectRepertoire ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        '📄'
                      )}
                    </Button>

                    {/* Booking button - always disabled */}
                    <Button
                      size="sm"
                      disabled
                      className="opacity-50 cursor-not-allowed"
                    >
                      <Lock className="w-3 h-3 mr-1" />
                      Prenota
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSongs.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              Nessuna canzone trovata
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Prova a modificare i filtri di ricerca
            </p>
          </div>
        )}
      </main>

      {/* Lyrics Dialog - only if not protected */}
      {selectedSong && !protectRepertoire && (
        <LyricsDialog
          songTitle={selectedSong.title}
          songArtist={selectedSong.artist}
          open={!!selectedSong}
          onOpenChange={(open) => !open && setSelectedSong(null)}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav variant="openmic" />
    </div>
  );
};

export default ConsultableOpenMic;
