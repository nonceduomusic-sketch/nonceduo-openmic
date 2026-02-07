import React, { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic2, Music, Eye, Lock, Search, ChevronLeft, Sparkles, Calendar, FileText, MessageCircle } from 'lucide-react';
import { Song } from '@/data/songs';
import { useSongsCatalog } from '@/hooks/useSongsCatalog';
import { SearchBar } from '@/components/SearchBar';
import { ArtistFilterDynamic } from '@/components/ArtistFilterDynamic';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SEO } from '@/components/SEO';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { cn } from '@/lib/utils';
import { useFormatActiveCheck } from '@/hooks/useGlobalFormatSettings';
import { useLiveEvent } from '@/hooks/useLiveEvent';
import { openLyrics } from '@/lib/lyricsLookup';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

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
  /**
   * Limita il numero di canzoni mostrate (per anteprima)
   */
  limitType?: 'percent' | 'count';
  limitValue?: number;
  /**
   * Messaggio da mostrare sotto le canzoni limitate
   */
  previewMessage?: string;
  /**
   * Mostra eventi in programma
   */
  showUpcomingEvents?: boolean;
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
  limitType,
  limitValue,
  previewMessage = 'e molto altro... vieni a scoprirlo partecipando ai nostri eventi!',
}) => {
  const [search, setSearch] = useState('');
  const [artistFilter, setArtistFilter] = useState('all');
  const navigate = useNavigate();
  
  // Load songs from database
  const { songs, loading: songsLoading } = useSongsCatalog();
  
  // Handler per aprire i testi direttamente
  const handleLyrics = useCallback(async (song: { title: string; artist: string }) => {
    if (!protectRepertoire) {
      await openLyrics(song.title, song.artist, navigate);
    }
  }, [protectRepertoire, navigate]);
  
  // Get upcoming events and setting for showing them
  const { upcomingEvents } = useLiveEvent();
  const { isActive: showUpcomingEvents } = useFormatActiveCheck('show_upcoming_events');

  // Calculate how many songs to show
  const maxSongsToShow = useMemo(() => {
    if (!limitType || !limitValue) return songs.length;
    
    if (limitType === 'percent') {
      return Math.ceil(songs.length * (limitValue / 100));
    }
    return limitValue;
  }, [limitType, limitValue, songs.length]);

  const isLimited = maxSongsToShow < songs.length;

  const filteredSongs = useMemo(() => {
    const searchLower = search.toLowerCase().trim();
    
    let result = songs.filter((song) => {
      if (!searchLower) {
        return artistFilter === 'all' || song.artist === artistFilter;
      }
      
      const matchesSearch =
        song.title.toLowerCase().includes(searchLower) ||
        song.artist.toLowerCase().includes(searchLower);

      const matchesArtist =
        artistFilter === 'all' || song.artist === artistFilter;

      return matchesSearch && matchesArtist;
    });

    // Apply limit only when not searching
    if (!search && artistFilter === 'all') {
      if (isLimited && result.length > maxSongsToShow) {
        result = result.slice(0, maxSongsToShow);
      }
    }

    return result;
  }, [songs, search, artistFilter, maxSongsToShow, isLimited]);


  // Show teaser message when songs are limited and no search active
  const showTeaserMessage = isLimited && !search && artistFilter === 'all';

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

          {/* Tagline - No numbers, just branding */}
          <div className="flex items-center gap-2 mb-4 text-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Centinaia di canzoni aggiornate ogni settimana!</span>
          </div>

          {/* Search & Filter */}
          <div className="space-y-3">
            <SearchBar value={search} onChange={setSearch} />
            <ArtistFilterDynamic value={artistFilter} onChange={setArtistFilter} songs={songs} />
          </div>
        </div>
      </header>

      {/* Song Catalog */}
      <main className="container py-4 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredSongs.map((song, index) => (
            <div
              key={`${song.title}-${song.artist}-${index}`}
              className="glass-card p-3 sm:p-4 transition-all duration-300 hover:scale-[1.02] group"
            >
              <div className="flex flex-col gap-3">
                {/* Icon and song info */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
                    <Music className="w-5 h-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0 py-0.5">
                    <h3 className="font-display font-semibold text-foreground text-sm sm:text-base leading-snug break-words">
                      {song.title}
                    </h3>
                    <p className="text-muted-foreground text-xs sm:text-sm leading-snug mt-1 break-words">
                      {song.artist}
                    </p>
                  </div>
                </div>

                {/* Buttons - Same style as live OpenMic */}
                <div className="flex gap-2">
                  {/* Prenota button - always disabled in preview */}
                  <Button
                    disabled
                    className="flex-1 h-10 sm:h-11 px-3 sm:px-4 text-xs sm:text-sm font-semibold opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
                    size="default"
                  >
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 flex-shrink-0" />
                    <span>Prenota</span>
                  </Button>

                  {/* Testo button - disabled if protected */}
                  <Button
                    onClick={() => handleLyrics(song)}
                    disabled={protectRepertoire}
                    variant="outline"
                    className={cn(
                      "flex-1 h-10 sm:h-11 px-3 sm:px-4 text-xs sm:text-sm font-semibold transition-all",
                      protectRepertoire 
                        ? "opacity-50 cursor-not-allowed border-muted text-muted-foreground" 
                        : "border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
                    )}
                    size="default"
                  >
                    {protectRepertoire ? (
                      <Lock className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 flex-shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 flex-shrink-0" />
                    )}
                    <span>Testo</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Teaser Message when limited */}
        {showTeaserMessage && (
          <div className="mt-8 text-center">
            <Card className="glass-card border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardContent className="py-8">
                <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
                <p className="text-lg font-display font-bold text-foreground mb-2">
                  {previewMessage}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Centinaia di canzoni aggiornate ogni settimana!
                </p>
                <Link to="/">
                  <Button className="neon-button-cyan">
                    Scopri i prossimi eventi
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Upcoming Events Section */}
        {showUpcomingEvents && upcomingEvents.length > 0 && (
          <div className="mt-8">
            <Card className="glass-card border-secondary/30">
              <CardContent className="py-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-secondary" />
                  <h3 className="font-display font-bold text-foreground">Prossimi Eventi</h3>
                </div>
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div 
                      key={event.id} 
                      className="p-3 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-foreground">{event.event_name}</p>
                        {event.event_date && (
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(event.event_date), "EEEE d MMMM", { locale: it })}
                            {event.event_start_time && ` • ${event.event_start_time.slice(0, 5)}`}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-secondary border-secondary/50">
                        In programma
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav variant="openmic" />
    </div>
  );
};

export default ConsultableOpenMic;