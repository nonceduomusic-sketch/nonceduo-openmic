import React, { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useBroadcast, useBroadcastSetlists, useBroadcastSetlistSongs } from '@/hooks/useBroadcast';
import { useReservations } from '@/hooks/useReservations';
import { useSongs } from '@/hooks/useSongs';
import { 
  Tv, 
  Play, 
  Square, 
  Music, 
  Search, 
  Plus, 
  List, 
  ExternalLink,
  Trash2,
  Edit2,
  Save,
  FolderOpen,
  QrCode,
  Settings,
  Eye,
  Monitor,
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
import { TVPreviewDialog } from './TVPreviewDialog';
import { SetlistSongItem } from './SetlistSongItem';
import { LiveBroadcastPreview } from './LiveBroadcastPreview';

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
  const [showPreview, setShowPreview] = useState(false);
  const [previewSongId, setPreviewSongId] = useState<string | undefined>();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filtered songs for search - show all if no query
  const filteredSongs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const filtered = query 
      ? songs.filter(s => s.titolo.toLowerCase().includes(query) || s.artista.toLowerCase().includes(query))
      : songs;
    return filtered.slice(0, 50); // Limit for performance
  }, [songs, searchQuery]);

  // Active reservations (not completed)
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

  // Handle drag end for reordering
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = setlistSongs.findIndex(s => s.id === active.id);
    const newIndex = setlistSongs.findIndex(s => s.id === over.id);
    
    if (oldIndex !== newIndex) {
      const newOrder = [...setlistSongs];
      const [removed] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, removed);
      
      await reorderSongs(newOrder.map(s => s.id));
    }
  }, [setlistSongs, reorderSongs]);

  // Move song up/down (for mobile)
  const handleMoveUp = useCallback(async (index: number) => {
    if (index <= 0) return;
    const newOrder = [...setlistSongs];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    await reorderSongs(newOrder.map(s => s.id));
  }, [setlistSongs, reorderSongs]);

  const handleMoveDown = useCallback(async (index: number) => {
    if (index >= setlistSongs.length - 1) return;
    const newOrder = [...setlistSongs];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    await reorderSongs(newOrder.map(s => s.id));
  }, [setlistSongs, reorderSongs]);

  const openTVPage = () => {
    window.open('/trasmetti', '_blank');
  };

  const openPreview = (songId?: string) => {
    setPreviewSongId(songId);
    setShowPreview(true);
  };

  return (
    <div className="space-y-6">
      {/* Live Control Panel - Show when broadcasting */}
      <LiveBroadcastPreview canManage={canManage} />

      {/* Header with TV controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Tv className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Trasmetti Karaoke</CardTitle>
                <CardDescription>Gestisci la visualizzazione TV</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch
                  id="broadcast-active"
                  checked={session?.is_active || false}
                  onCheckedChange={async (checked) => {
                    if (!canManage) return;
                    const success = await toggleActive(checked);
                    if (success) {
                      toast.success(checked ? 'Trasmissione attivata' : 'Trasmissione disattivata');
                    }
                  }}
                  disabled={!canManage}
                />
                <Label htmlFor="broadcast-active" className="text-sm">
                  {session?.is_active ? 'Attivo' : 'Spento'}
                </Label>
              </div>
              <Button variant="outline" size="sm" onClick={() => openPreview()}>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
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
            <Music className="w-4 h-4 mr-2" />
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
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const song = songs.find(s => 
                              s.titolo === reservation.song_title && s.artista === reservation.song_artist
                            );
                            if (song) openPreview(song.id);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={async () => {
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
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Catalog Tab - Shows all songs immediately */}
        <TabsContent value="catalog" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Catalogo Canzoni ({songs.length})</CardTitle>
                {selectedSetlistId && (
                  <Badge variant="secondary">
                    Scaletta selezionata - clicca + per aggiungere
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Filtra per titolo o artista..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {filteredSongs.map((song) => (
                    <div
                      key={song.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{song.titolo}</p>
                        {song.testo && (
                          <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">Testo</Badge>
                        )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{song.artista}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPreview(song.id)}
                          className="h-9 w-9 p-0"
                        >
                          <Eye className="w-4 h-4 shrink-0" />
                        </Button>
                        {selectedSetlistId && canFull && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addToSetlist(song.id)}
                            className="h-9 w-9 p-0"
                          >
                            <Plus className="w-4 h-4 shrink-0" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleBroadcast(song.id)}
                          disabled={!canManage}
                          className="h-9 px-2.5"
                        >
                          <Play className="w-4 h-4 mr-1 shrink-0" />
                          <span className="hidden sm:inline">Trasmetti</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {filteredSongs.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  Nessuna canzone trovata
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Setlists Tab with Drag & Drop */}
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

            {/* Selected Setlist Songs with Drag & Drop */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {selectedSetlistId
                    ? setlists.find(s => s.id === selectedSetlistId)?.name || 'Scaletta'
                    : 'Seleziona una Scaletta'}
                </CardTitle>
                {selectedSetlistId && setlistSongs.length > 0 && canFull && (
                  <CardDescription className="text-xs">
                    Trascina per riordinare le canzoni
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {!selectedSetlistId ? (
                  <p className="text-muted-foreground text-center py-8">
                    Seleziona una scaletta per vedere le canzoni
                  </p>
                ) : setlistSongs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Scaletta vuota. Vai al Catalogo e clicca + per aggiungere canzoni.
                  </p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={setlistSongs.map(s => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {setlistSongs.map((item, index) => (
                          <SetlistSongItem
                            key={item.id}
                            id={item.id}
                            index={index}
                            title={item.song?.titolo || 'Canzone sconosciuta'}
                            artist={item.song?.artista || ''}
                            songId={item.song?.id || ''}
                            canManage={canManage}
                            canFull={canFull}
                            onBroadcast={handleBroadcast}
                            onRemove={removeFromSetlist}
                            onMoveUp={() => handleMoveUp(index)}
                            onMoveDown={() => handleMoveDown(index)}
                            isFirst={index === 0}
                            isLast={index === setlistSongs.length - 1}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
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

      {/* TV Preview Dialog */}
      <TVPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        previewSongId={previewSongId}
      />
    </div>
  );
}
