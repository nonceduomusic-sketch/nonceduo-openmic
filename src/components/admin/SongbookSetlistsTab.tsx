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
import { useSongbookFiles, useSongbookSetlists, useSongbookSetlistSongs } from '@/hooks/useSongbook';
import { useBroadcast } from '@/hooks/useBroadcast';
import {
  FolderOpen,
  Plus,
  Save,
  Edit2,
  Trash2,
  Search,
  Music,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SongbookSetlistSongItem } from './SongbookSetlistSongItem';

interface SongbookSetlistsTabProps {
  canManage?: boolean;
  canFull?: boolean;
}

export function SongbookSetlistsTab({ canManage = true, canFull = true }: SongbookSetlistsTabProps) {
  const { files } = useSongbookFiles();
  const { setlists, createSetlist, updateSetlist, deleteSetlist } = useSongbookSetlists();
  const { updateSession } = useBroadcast('main');
  
  const [selectedSetlistId, setSelectedSetlistId] = useState<string | null>(null);
  const { songs: setlistSongs, addSong, removeSong, reorderSongs } = useSongbookSetlistSongs(selectedSetlistId);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [newSetlistName, setNewSetlistName] = useState('');
  const [showNewSetlistDialog, setShowNewSetlistDialog] = useState(false);
  const [editingSetlist, setEditingSetlist] = useState<{ id: string; name: string } | null>(null);

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

  // Filtered files for search
  const filteredFiles = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const filtered = query
      ? files.filter(f => 
          f.title.toLowerCase().includes(query) || 
          (f.artist?.toLowerCase().includes(query) || false)
        )
      : files;
    return filtered.slice(0, 50);
  }, [files, searchQuery]);

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
    const success = await updateSetlist(editingSetlist.id, { name: editingSetlist.name });
    if (success) {
      toast.success('Scaletta rinominata');
    }
    setEditingSetlist(null);
  };

  const handleDeleteSetlist = async (id: string) => {
    if (!canFull) return;
    await deleteSetlist(id);
    if (selectedSetlistId === id) {
      setSelectedSetlistId(null);
    }
  };

  const handleAddToSetlist = async (fileId: string) => {
    if (!selectedSetlistId || !canFull) return;
    const success = await addSong(fileId);
    if (success) {
      toast.success('Brano aggiunto alla scaletta');
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

  // Broadcast a songbook file
  const handleBroadcast = async (fileId: string) => {
    if (!canManage) {
      toast.error('Non hai i permessi per trasmettere');
      return;
    }
    
    const success = await updateSession({
      songbook_mode: true,
      songbook_file_id: fileId,
      display_mode: 'lyrics',
      is_broadcasting: true,
    });
    
    if (success) {
      toast.success('Brano SongBook in trasmissione!');
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Left Column: Setlist List + Catalog */}
      <div className="space-y-4">
        {/* Setlist List */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                Scalette SongBook
              </CardTitle>
              {canFull && (
                <Dialog open={showNewSetlistDialog} onOpenChange={setShowNewSetlistDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-10 sm:h-11 px-3 sm:px-4">
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />
                      Nuova
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crea Nuova Scaletta SongBook</DialogTitle>
                      <DialogDescription>
                        Dai un nome alla tua nuova scaletta di brani ChordPro
                      </DialogDescription>
                    </DialogHeader>
                    <Input
                      placeholder="Nome scaletta..."
                      value={newSetlistName}
                      onChange={(e) => setNewSetlistName(e.target.value)}
                      className="h-11 sm:h-12"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateSetlist();
                      }}
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
              <p className="text-muted-foreground text-center py-6 text-sm">
                Nessuna scaletta. Crea la prima!
              </p>
            ) : (
              <div className="space-y-2">
                {setlists.map((setlist) => (
                  <div
                    key={setlist.id}
                    className={cn(
                      "flex items-center justify-between p-3 sm:p-4 rounded-xl cursor-pointer transition-colors",
                      selectedSetlistId === setlist.id
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-muted/30 hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedSetlistId(setlist.id)}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-sm sm:text-base truncate">{setlist.name}</span>
                    </div>
                    {canFull && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9"
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
                              className="h-9 w-9 text-destructive"
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

        {/* File Catalog for adding to setlist */}
        {selectedSetlistId && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  Aggiungi Brani ({files.length})
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  Clicca + per aggiungere
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca brano..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>

              <ScrollArea className="h-[200px] sm:h-[250px]">
                <div className="space-y-1.5">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{file.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{file.artist || 'Artista sconosciuto'}</p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 shrink-0"
                        onClick={() => handleAddToSetlist(file.id)}
                        disabled={!canFull}
                      >
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column: Selected Setlist Songs */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base sm:text-lg">
            {selectedSetlistId
              ? setlists.find(s => s.id === selectedSetlistId)?.name || 'Scaletta'
              : 'Seleziona una Scaletta'}
          </CardTitle>
          {selectedSetlistId && setlistSongs.length > 0 && (
            <CardDescription className="text-xs sm:text-sm">
              {canFull ? 'Trascina per riordinare • Premi Play per trasmettere' : 'Premi Play per trasmettere'}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {!selectedSetlistId ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FolderOpen className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm text-center">
                Seleziona una scaletta dalla lista per vedere i brani
              </p>
            </div>
          ) : setlistSongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Music className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm text-center">
                Scaletta vuota. Usa la ricerca qui a fianco per aggiungere brani.
              </p>
            </div>
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
                <ScrollArea className="h-[400px] sm:h-[500px]">
                  <div className="space-y-2 sm:space-y-3 pr-2">
                    {setlistSongs.map((item, index) => (
                      <SongbookSetlistSongItem
                        key={item.id}
                        id={item.id}
                        index={index}
                        title={item.file?.title || 'Brano sconosciuto'}
                        artist={item.file?.artist || ''}
                        fileId={item.file?.id || ''}
                        canManage={canManage}
                        canFull={canFull}
                        onBroadcast={handleBroadcast}
                        onRemove={removeSong}
                        onMoveUp={() => handleMoveUp(index)}
                        onMoveDown={() => handleMoveDown(index)}
                        isFirst={index === 0}
                        isLast={index === setlistSongs.length - 1}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Rename Setlist Dialog */}
      <Dialog open={!!editingSetlist} onOpenChange={() => setEditingSetlist(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rinomina Scaletta</DialogTitle>
          </DialogHeader>
          <Input
            value={editingSetlist?.name || ''}
            onChange={(e) => setEditingSetlist(prev => prev ? { ...prev, name: e.target.value } : null)}
            className="h-11"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSetlist();
            }}
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
