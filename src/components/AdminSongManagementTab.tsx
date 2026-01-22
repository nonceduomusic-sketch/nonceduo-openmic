import React, { useState, useMemo } from 'react';
import { 
  Music, 
  Lock, 
  Unlock, 
  CheckCircle, 
  RefreshCw, 
  Search,
  AlertTriangle,
  RotateCcw,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useReservations, Reservation } from '@/hooks/useReservations';
import { songs } from '@/data/songs';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export const AdminSongManagementTab: React.FC = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { 
    activeReservations, 
    completedReservations,
    completeReservation,
    reactivateReservation,
    deleteReservation,
    restoreReservation,
    resetAllReservations,
    loading 
  } = useReservations();
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'booked' | 'available'>('all');

  const filterLabels = {
    all: 'Tutte',
    booked: 'Prenotate',
    available: 'Disponibili',
  };

  // Normalize text for comparison (handle different apostrophe characters)
  const normalizeText = (text: string) => {
    return text.replace(/[''`´]/g, "'").toLowerCase().trim();
  };

  const getSongKey = (title: string, artist: string) => {
    return `${normalizeText(title)}__${normalizeText(artist)}`;
  };

  // Create a map of booked and completed songs
  const songStatusMap = useMemo(() => {
    const map = new Map<string, { status: 'booked' | 'completed'; reservation: Reservation }>();
    
    activeReservations.forEach(res => {
      const key = getSongKey(res.song_title, res.song_artist);
      map.set(key, { status: 'booked', reservation: res });
    });
    
    completedReservations.forEach(res => {
      const key = getSongKey(res.song_title, res.song_artist);
      // Only mark as completed if not actively booked
      if (!map.has(key)) {
        map.set(key, { status: 'completed', reservation: res });
      }
    });
    
    return map;
  }, [activeReservations, completedReservations]);

  const enrichedSongs = useMemo(() => {
    return songs.map(song => {
      const key = getSongKey(song.title, song.artist);
      const statusInfo = songStatusMap.get(key);
      return {
        ...song,
        status: statusInfo?.status || 'available',
        reservation: statusInfo?.reservation,
      };
    }).filter(song => {
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        song.title.toLowerCase().includes(searchLower) ||
        song.artist.toLowerCase().includes(searchLower);
      
      const matchesFilter = 
        filter === 'all' || 
        (filter === 'booked' && (song.status === 'booked' || song.status === 'completed')) ||
        (filter === 'available' && song.status === 'available');
      
      return matchesSearch && matchesFilter;
    });
  }, [songs, songStatusMap, search, filter]);

  // Counts should reflect unique songs (not raw reservations).
  const bookedCount = useMemo(() => {
    const keys = new Set<string>();
    activeReservations.forEach(res => keys.add(getSongKey(res.song_title, res.song_artist)));
    return keys.size;
  }, [activeReservations]);

  const completedCount = useMemo(() => {
    // Completed songs that are not currently booked (see songStatusMap logic).
    let count = 0;
    songStatusMap.forEach((v) => {
      if (v.status === 'completed') count += 1;
    });
    return count;
  }, [songStatusMap]);

  const unavailableCount = songStatusMap.size;
  const availableCount = Math.max(0, songs.length - unavailableCount);

  const handleCompleteSong = async (reservation: Reservation) => {
    const previousStatus = reservation.status;
    const success = await completeReservation(reservation.id);
    if (success) {
      toast({
        title: 'Canzone completata',
        description: `"${reservation.song_title}" segnata come cantata.`,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await reactivateReservation(reservation.id);
              toast({
                title: 'Ripristinato',
                description: `"${reservation.song_title}" è di nuovo in coda.`,
              });
            }}
            className="shrink-0"
          >
            Annulla
          </Button>
        ),
      });
    }
  };

  const handleUnlockSong = async (reservation: Reservation) => {
    // Delete the reservation to unlock the song
    const reservationCopy = { ...reservation };
    const success = await deleteReservation(reservation.id);
    if (success) {
      toast({
        title: 'Canzone sbloccata',
        description: `"${reservation.song_title}" è ora disponibile.`,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await restoreReservation(reservationCopy);
              toast({
                title: 'Ripristinato',
                description: `"${reservationCopy.song_title}" prenotazione ripristinata.`,
              });
            }}
            className="shrink-0"
          >
            Annulla
          </Button>
        ),
      });
    }
  };

  const handleReleaseSong = async (reservation: Reservation) => {
    // Delete the reservation entirely
    const reservationCopy = { ...reservation };
    const success = await deleteReservation(reservation.id);
    if (success) {
      toast({
        title: 'Prenotazione rimossa',
        description: `"${reservation.song_title}" è di nuovo disponibile.`,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await restoreReservation(reservationCopy);
              toast({
                title: 'Ripristinato',
                description: `"${reservationCopy.song_title}" prenotazione ripristinata.`,
              });
            }}
            className="shrink-0"
          >
            Annulla
          </Button>
        ),
      });
    }
  };

  const handleResetAll = async () => {
    const success = await resetAllReservations();
    if (success) {
      toast({
        title: 'Reset completato',
        description: 'Tutte le canzoni sono ora disponibili.',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 md:pb-4">
      {/* Header - Compact on mobile */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg md:text-xl font-bold text-foreground">
              Gestione Canzoni
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              {bookedCount} in coda • {completedCount} completate • {availableCount} disponibili
            </p>
          </div>
          
          {/* Reset button - icon only on mobile */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size={isMobile ? "icon" : "default"}
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground shrink-0"
                disabled={unavailableCount === 0}
              >
                <RotateCcw className="w-4 h-4" />
                {!isMobile && <span className="ml-2">Reset Globale</span>}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-card border-destructive max-w-[90vw] md:max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Reset Globale
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Sei sicuro di voler cancellare tutte le prenotazioni? 
                  Tutte le canzoni torneranno disponibili. 
                  Questa azione non può essere annullata.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border">Annulla</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleResetAll}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Conferma Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Search and filters - optimized for mobile */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          
          {/* Mobile: Dropdown filter */}
          {isMobile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0 h-9 gap-1">
                  <Filter className="w-4 h-4" />
                  <span className="text-xs">{filterLabels[filter]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilter('all')}>
                  <Music className="w-4 h-4 mr-2" />
                  Tutte
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('booked')}>
                  <Lock className="w-4 h-4 mr-2 text-warning" />
                  Prenotate ({unavailableCount})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('available')}>
                  <Unlock className="w-4 h-4 mr-2 text-secondary" />
                  Disponibili ({availableCount})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            /* Desktop: Button group */
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className={filter === 'all' ? 'neon-button-pink' : ''}
              >
                Tutte
              </Button>
              <Button
                variant={filter === 'booked' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('booked')}
                className={cn(
                  filter === 'booked' && 'bg-warning text-warning-foreground hover:bg-warning/90'
                )}
              >
                <Lock className="w-3 h-3 mr-1" />
                Prenotate ({unavailableCount})
              </Button>
              <Button
                variant={filter === 'available' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('available')}
                className={filter === 'available' ? 'neon-button-cyan' : ''}
              >
                Disponibili
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Song list */}
      <div className="space-y-2 max-h-[50vh] md:max-h-[60vh] overflow-y-auto">
        {enrichedSongs.length === 0 ? (
          <div className="text-center py-12">
            <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">Nessuna canzone trovata</p>
          </div>
        ) : (
          enrichedSongs.map((song, index) => (
            <div
              key={`${song.title}-${song.artist}-${index}`}
              className={cn(
                "flex flex-col md:flex-row md:items-center gap-2 md:gap-0 p-3 rounded-lg border transition-colors",
                song.status === 'available' && "bg-card border-border",
                song.status === 'booked' && "bg-warning/10 border-warning/30",
                song.status === 'completed' && "bg-secondary/10 border-secondary/30"
              )}
            >
              {/* Song info row */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  song.status === 'available' && "bg-muted",
                  song.status === 'booked' && "bg-warning/20",
                  song.status === 'completed' && "bg-secondary/20"
                )}>
                  {song.status === 'booked' && <Lock className="w-4 h-4 text-warning" />}
                  {song.status === 'completed' && <CheckCircle className="w-4 h-4 text-secondary" />}
                  {song.status === 'available' && <Music className="w-4 h-4 text-muted-foreground" />}
                </div>
                
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate text-sm">
                    {song.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {song.artist}
                    {song.reservation && !isMobile && (
                      <span className="ml-2 text-warning">
                        • {song.reservation.customer_name}
                      </span>
                    )}
                  </p>
                  {/* Mobile: show customer on separate line */}
                  {song.reservation && isMobile && (
                    <p className="text-xs text-warning truncate">
                      👤 {song.reservation.customer_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              {song.status !== 'available' && song.reservation && (
                <div className="flex gap-2 ml-11 md:ml-2">
                  {song.status === 'booked' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCompleteSong(song.reservation!)}
                        className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground h-8 text-xs flex-1 md:flex-none"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completa
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReleaseSong(song.reservation!)}
                        className="border-warning text-warning hover:bg-warning hover:text-warning-foreground h-8 text-xs flex-1 md:flex-none"
                      >
                        <Unlock className="w-3 h-3 mr-1" />
                        Sblocca
                      </Button>
                    </>
                  )}
                  {song.status === 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReleaseSong(song.reservation!)}
                      className="border-muted-foreground text-muted-foreground hover:bg-muted h-8 text-xs flex-1 md:flex-none"
                    >
                      <Unlock className="w-3 h-3 mr-1" />
                      Rimuovi
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
