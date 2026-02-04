import React, { useState, useMemo } from 'react';
import { useBroadcast, useBroadcastSetlists, useBroadcastSetlistSongs } from '@/hooks/useBroadcast';
import { useReservations } from '@/hooks/useReservations';
import { useSongs } from '@/hooks/useSongs';
import { supabase } from '@/integrations/supabase/client';
import { 
  Tv, 
  Play, 
  Square, 
  Music, 
  Search, 
  Plus, 
  List, 
  ExternalLink,
  GripVertical,
  Trash2,
  Edit2,
  Save,
  FolderOpen,
  QrCode,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { BroadcastTVSettings } from './BroadcastTVSettings';

interface AdminTrasmettiTabProps {
  canManage?: boolean;
  canFull?: boolean;
}

export function AdminTrasmettiTab({ canManage = true, canFull = true }: AdminTrasmettiTabProps) {
  const { session, broadcastSong, stopBroadcast, toggleActive, updateSession } = useBroadcast('main');
  const { activeReservations } = useReservations();
  const { songs } = useSongs();
  const { setlists, createSetlist, updateSetlist, deleteSetlist } = useBroadcastSetlists();
  
  const [selectedSetlistId, setSelectedSetlistId] = useState<string | null>(null);
  const { songs: setlistSongs, addSong: addToSetlist, removeSong: removeFromSetlist, reorderSongs } = useBroadcastSetlistSongs(selectedSetlistId);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [newSetlistName, setNewSetlistName] = useState('');
  const [showNewSetlistDialog, setShowNewSetlistDialog] = useState(false);
  const [editingSetlist, setEditingSetlist] = useState<{ id: string; name: string } | null>(null);

  // Filtered songs for search
  const filteredSongs = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return songs.filter(
      s => s.titolo.toLowerCase().includes(query) || s.artista.toLowerCase().includes(query)
    ).slice(0, 20);
  }, [songs, searchQuery]);

  // Active reservations (not completed) - these are in_progress status
  const pendingReservations = activeReservations.filter(r => r.status === 'in_progress');

  const handleBroadcast = async (songId: string, reservationId?: string) => {
    if (!canManage) {
      toast.error('Non hai i permessi per trasmettere');
      return;
    }
    const success = await broadcastSong(songId, reservationId);
    if (success) {
      toast.success('Trasmissione avviata!');
    }
  };

  const handleStop = async () => {
    if (!canManage) return;
    await stopBroadcast();
    toast.success('Trasmissione fermata');
  };

  const handleCreateSetlist = async () => {
    if (!canFull || !newSetlistName.trim()) return;
    const result = await createSetlist(newSetlistName.trim());
    if (result) {
      setNewSetlistName('');
      setShowNewSetlistDialog(false);
      setSelectedSetlistId(result.id);
    }
  };

  const handleRenameSetlist = async () => {
    if (!editingSetlist || !canFull) return;
    await updateSetlist(editingSetlist.id, { name: editingSetlist.name });
    setEditingSetlist(null);
  };

  const handleDeleteSetlist = async (id: string) => {
    if (!canFull) return;
    await deleteSetlist(id);
    if (selectedSetlistId === id) {
      setSelectedSetlistId(null);
    }
  };

  const openTVPage = () => {
    window.open('/trasmetti', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header with TV controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Tv className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Trasmetti Karaoke</CardTitle>
                <CardDescription>Gestisci la visualizzazione TV</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="broadcast-active"
                  checked={session?.is_active || false}
                  onCheckedChange={canManage ? toggleActive : undefined}
                  disabled={!canManage}
                />
                <Label htmlFor="broadcast-active" className="text-sm">
                  {session?.is_active ? 'Attivo' : 'Spento'}
                </Label>
              </div>
              <Button variant="outline" size="sm" onClick={openTVPage}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Apri TV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {session?.display_mode === 'lyrics' && session.current_song_id ? (
            <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="font-medium text-green-600 dark:text-green-400">
                  Trasmissione in corso
                </span>
              </div>
              <Button variant="destructive" size="sm" onClick={handleStop} disabled={!canManage}>
                <Square className="w-4 h-4 mr-2" />
                Ferma
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
              <QrCode className="w-5 h-5 text-muted-foreground" />
              <span className="text-muted-foreground">
                Schermata di attesa con QR code attiva
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main content tabs */}
      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="queue">
            <List className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Scaletta</span> Live
          </TabsTrigger>
          <TabsTrigger value="catalog">
            <Search className="w-4 h-4 mr-2" />
            Catalogo
          </TabsTrigger>
          <TabsTrigger value="setlists">
            <FolderOpen className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Le Mie</span> Scalette
          </TabsTrigger>
          <TabsTrigger value="tv-settings">
            <Settings className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Impostazioni</span> TV
          </TabsTrigger>
        </TabsList>

        {/* Live Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Music className="w-4 h-4" />
                Prenotazioni da Completare ({pendingReservations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingReservations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nessuna prenotazione in coda
                </p>
              ) : (
                <div className="space-y-2">
                  {pendingReservations.map((reservation, index) => (
                    <div
                      key={reservation.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="w-8 h-8 flex items-center justify-center rounded-full">
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium">{reservation.song_title}</p>
                          <p className="text-sm text-muted-foreground">
                            {reservation.song_artist} • {reservation.customer_name}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={async () => {
                          // Find song by title+artist to get song_id
                          const song = songs.find(s => 
                            s.titolo === reservation.song_title && s.artista === reservation.song_artist
                          );
                          if (song) {
                            handleBroadcast(song.id, reservation.id);
                          } else {
                            toast.error('Canzone non trovata nel catalogo');
                          }
                        }}
                        disabled={!canManage}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Trasmetti
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Catalog Search Tab */}
        <TabsContent value="catalog" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cerca nel Catalogo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca canzone o artista..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {filteredSongs.length > 0 && (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredSongs.map((song) => (
                      <div
                        key={song.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <p className="font-medium">{song.titolo}</p>
                          <p className="text-sm text-muted-foreground">{song.artista}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedSetlistId && canFull && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addToSetlist(song.id)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleBroadcast(song.id)}
                            disabled={!canManage}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Trasmetti
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {searchQuery && filteredSongs.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  Nessuna canzone trovata
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Setlists Tab */}
        <TabsContent value="setlists" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Setlist List */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Scalette Salvate</CardTitle>
                  {canFull && (
                    <Dialog open={showNewSetlistDialog} onOpenChange={setShowNewSetlistDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Plus className="w-4 h-4 mr-2" />
                          Nuova
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Crea Nuova Scaletta</DialogTitle>
                          <DialogDescription>
                            Dai un nome alla tua nuova scaletta
                          </DialogDescription>
                        </DialogHeader>
                        <Input
                          placeholder="Nome scaletta..."
                          value={newSetlistName}
                          onChange={(e) => setNewSetlistName(e.target.value)}
                        />
                        <DialogFooter>
                          <Button onClick={handleCreateSetlist} disabled={!newSetlistName.trim()}>
                            <Save className="w-4 h-4 mr-2" />
                            Crea
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {setlists.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nessuna scaletta salvata
                  </p>
                ) : (
                  <div className="space-y-2">
                    {setlists.map((setlist) => (
                      <div
                        key={setlist.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                          selectedSetlistId === setlist.id
                            ? "bg-primary/10 border border-primary/20"
                            : "bg-muted/30 hover:bg-muted/50"
                        )}
                        onClick={() => setSelectedSetlistId(setlist.id)}
                      >
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{setlist.name}</span>
                        </div>
                        {canFull && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSetlist({ id: setlist.id, name: setlist.name });
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Elimina Scaletta</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Sei sicuro di voler eliminare "{setlist.name}"?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteSetlist(setlist.id)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Elimina
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selected Setlist Songs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {selectedSetlistId
                    ? setlists.find(s => s.id === selectedSetlistId)?.name || 'Scaletta'
                    : 'Seleziona una Scaletta'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedSetlistId ? (
                  <p className="text-muted-foreground text-center py-8">
                    Seleziona una scaletta per vedere le canzoni
                  </p>
                ) : setlistSongs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Scaletta vuota. Cerca canzoni nel catalogo e aggiungile.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {setlistSongs.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg"
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                        <Badge variant="outline" className="w-6 h-6 flex items-center justify-center rounded-full text-xs">
                          {index + 1}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.song?.titolo}</p>
                          <p className="text-sm text-muted-foreground truncate">{item.song?.artista}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            onClick={() => item.song && handleBroadcast(item.song.id)}
                            disabled={!canManage}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                          {canFull && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeFromSetlist(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TV Settings Tab */}
        <TabsContent value="tv-settings" className="space-y-4">
          <BroadcastTVSettings canManage={canManage} />
        </TabsContent>
      </Tabs>

      {/* Rename Setlist Dialog */}
      <Dialog open={!!editingSetlist} onOpenChange={() => setEditingSetlist(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rinomina Scaletta</DialogTitle>
          </DialogHeader>
          <Input
            value={editingSetlist?.name || ''}
            onChange={(e) => setEditingSetlist(prev => prev ? { ...prev, name: e.target.value } : null)}
          />
          <DialogFooter>
            <Button onClick={handleRenameSetlist}>
              <Save className="w-4 h-4 mr-2" />
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
