import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Menu,
  Music,
  ListMusic,
  Search,
  Plus,
  Play,
  Trash2,
  GripVertical,
  Eye,
  FolderOpen,
  ArrowUpDown,
  Upload,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SongbookFile, SongbookSetlistSong, useSongbookSetlists, useSongbookSetlistSongs } from '@/hooks/useSongbook';
import { extractChordProTitle } from '@/lib/chordpro';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// --- Sortable setlist song item ---
function SortableSetlistItem({
  id,
  index,
  title,
  artist,
  isFirst,
  isLast,
  onPlay,
  onPreview,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  id: string;
  index: number;
  title: string;
  artist: string;
  isFirst: boolean;
  isLast: boolean;
  onPlay: () => void;
  onPreview: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-3 bg-muted/30 rounded-xl transition-all',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary/50 z-50'
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
        <GripVertical className="w-5 h-5" />
      </button>
      <Badge variant="outline" className="w-7 h-7 flex items-center justify-center rounded-full text-xs shrink-0">
        {index + 1}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{artist || 'Artista sconosciuto'}</p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <Button size="icon" variant="ghost" className="h-10 w-10" onClick={onPreview} title="Anteprima">
          <Eye className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-10 w-10" onClick={onPlay} title="Trasmetti">
          <Play className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-10 w-10 text-destructive" onClick={onRemove} title="Rimuovi">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// --- Import duplicate resolution ---
interface DuplicateInfo {
  fileName: string;
  title: string;
  artist: string;
  content: string;
  existingFileId: string | null;
}

// --- Main Drawer ---
interface SongbookLiveDrawerProps {
  files: SongbookFile[];
  onSelectFile: (file: SongbookFile) => void;
  onBroadcastFile: (file: SongbookFile) => void;
  onSetlistBroadcast?: (file: SongbookFile, setlistSongs: SongbookSetlistSong[]) => void;
}

export function SongbookLiveDrawer({ files, onSelectFile, onBroadcastFile, onSetlistBroadcast }: SongbookLiveDrawerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'brani' | 'scalette'>('brani');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'title' | 'artist' | 'recent'>('title');

  // Setlists
  const { setlists, createSetlist, deleteSetlist } = useSongbookSetlists();
  const [selectedSetlistId, setSelectedSetlistId] = useState<string | null>(null);
  const { songs: setlistSongs, addSong, removeSong, reorderSongs } = useSongbookSetlistSongs(selectedSetlistId);

  // New setlist dialog
  const [showNewSetlist, setShowNewSetlist] = useState(false);
  const [newSetlistName, setNewSetlistName] = useState('');

  // Add to setlist dialog
  const [showAddSong, setShowAddSong] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');

  // Import state
  const [importing, setImporting] = useState(false);
  const [showImportDuplicates, setShowImportDuplicates] = useState(false);
  const [importDuplicates, setImportDuplicates] = useState<DuplicateInfo[]>([]);
  const [importResolvedFiles, setImportResolvedFiles] = useState<{ fileId: string; position: number }[]>([]);
  const [duplicateChoice, setDuplicateChoice] = useState<'existing' | 'new' | null>(null);
  const [applyToAll, setApplyToAll] = useState(false);
  const [currentDuplicateIndex, setCurrentDuplicateIndex] = useState(0);
  const [pendingImportSetlistId, setPendingImportSetlistId] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Quick add to first setlist
  const addSongToFirstSetlist = useCallback(async (fileId: string) => {
    if (setlists.length === 0) return;
    const targetSetlistId = setlists[0].id;
    const { data: existing } = await supabase
      .from('songbook_setlist_songs')
      .select('position')
      .eq('setlist_id', targetSetlistId)
      .order('position', { ascending: false })
      .limit(1);
    const nextPos = existing && existing.length > 0 ? existing[0].position + 1 : 0;
    const { error } = await supabase
      .from('songbook_setlist_songs')
      .insert({ setlist_id: targetSetlistId, songbook_file_id: fileId, position: nextPos });
    if (error) {
      toast.error('Errore aggiunta brano');
    } else {
      const file = files.find(f => f.id === fileId);
      toast.success(`"${file?.title}" aggiunto a "${setlists[0].name}"`);
    }
  }, [setlists, files]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Filter & sort files
  const filteredFiles = useMemo(() => {
    let result = [...files];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => f.title.toLowerCase().includes(q) || (f.artist && f.artist.toLowerCase().includes(q)));
    }
    switch (sortMode) {
      case 'title': result.sort((a, b) => a.title.localeCompare(b.title, 'it')); break;
      case 'artist': result.sort((a, b) => (a.artist || '').localeCompare(b.artist || '', 'it') || a.title.localeCompare(b.title, 'it')); break;
      case 'recent': result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
    }
    return result;
  }, [files, searchQuery, sortMode]);

  // Add song search results
  const addSearchResults = useMemo(() => {
    if (!addSearchQuery.trim()) return files.slice(0, 30);
    const q = addSearchQuery.toLowerCase();
    return files.filter(f => f.title.toLowerCase().includes(q) || (f.artist && f.artist.toLowerCase().includes(q))).slice(0, 30);
  }, [files, addSearchQuery]);

  const handleCreateSetlist = async () => {
    if (!newSetlistName.trim()) return;
    const result = await createSetlist(newSetlistName.trim());
    if (result) {
      setSelectedSetlistId(result.id);
      setNewSetlistName('');
      setShowNewSetlist(false);
    }
  };

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

  const handlePlayFromSetlist = (song: typeof setlistSongs[0]) => {
    const file = files.find(f => f.id === song.songbook_file_id);
    if (file) {
      if (onSetlistBroadcast) {
        onSetlistBroadcast(file, setlistSongs);
      } else {
        onBroadcastFile(file);
      }
      setOpen(false);
    }
  };

  const handlePreviewFromSetlist = (song: typeof setlistSongs[0]) => {
    const file = files.find(f => f.id === song.songbook_file_id);
    if (file) {
      onSelectFile(file);
      setOpen(false);
    }
  };

  // --- Import setlist from folder ---
  const handleImportFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setImporting(true);
    try {
      // Filter .cho files and sort by name (folder order)
      const choFiles = Array.from(fileList)
        .filter(f => f.name.toLowerCase().endsWith('.cho'))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (choFiles.length === 0) {
        toast.warning('Nessun file .cho trovato nella cartella');
        setImporting(false);
        return;
      }

      // Read all files
      const parsedFiles: { fileName: string; title: string; artist: string; content: string }[] = [];
      for (const file of choFiles) {
        const content = await file.text();
        const { title, artist } = extractChordProTitle(content);
        parsedFiles.push({
          fileName: file.name,
          title: title || file.name.replace(/\.cho$/i, ''),
          artist: artist || '',
          content,
        });
      }

      // Check for existing files in DB
      const duplicates: DuplicateInfo[] = [];
      const resolvedFiles: { fileId: string; position: number }[] = [];

      for (let i = 0; i < parsedFiles.length; i++) {
        const pf = parsedFiles[i];
        // Find match by title (case-insensitive)
        const existing = files.find(f =>
          f.title.toLowerCase().trim() === pf.title.toLowerCase().trim() &&
          (f.artist || '').toLowerCase().trim() === pf.artist.toLowerCase().trim()
        );

        if (existing) {
          duplicates.push({
            fileName: pf.fileName,
            title: pf.title,
            artist: pf.artist,
            content: pf.content,
            existingFileId: existing.id,
          });
        } else {
          // Upload new file
          const { data, error } = await supabase
            .from('songbook_files')
            .insert({
              title: pf.title,
              artist: pf.artist || null,
              content: pf.content,
              filename: pf.fileName,
            })
            .select('id')
            .single();

          if (error) {
            console.error('Import upload error:', error);
          } else if (data) {
            resolvedFiles.push({ fileId: data.id, position: i });
          }
        }
      }

      if (duplicates.length > 0) {
        // Show duplicate resolution dialog
        setImportDuplicates(duplicates);
        setImportResolvedFiles(resolvedFiles);
        setCurrentDuplicateIndex(0);
        setDuplicateChoice(null);
        setApplyToAll(false);

        // Create the setlist first
        const setlistName = choFiles[0]?.webkitRelativePath?.split('/')[0] || 'Scaletta Importata';
        const newSetlist = await createSetlist(setlistName);
        if (newSetlist) {
          setPendingImportSetlistId(newSetlist.id);
        }
        setShowImportDuplicates(true);
      } else {
        // No duplicates - create setlist directly
        const setlistName = choFiles[0]?.webkitRelativePath?.split('/')[0] || 'Scaletta Importata';
        const newSetlist = await createSetlist(setlistName);
        if (newSetlist) {
          // Add all songs in order
          for (const rf of resolvedFiles.sort((a, b) => a.position - b.position)) {
            await supabase
              .from('songbook_setlist_songs')
              .insert({ setlist_id: newSetlist.id, songbook_file_id: rf.fileId, position: rf.position });
          }
          setSelectedSetlistId(newSetlist.id);
          toast.success(`Scaletta importata con ${resolvedFiles.length} brani`);
        }
      }
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Errore durante l\'importazione');
    } finally {
      setImporting(false);
      // Reset input
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const handleResolveDuplicate = async (choice: 'existing' | 'new') => {
    if (!pendingImportSetlistId) return;

    const processFrom = applyToAll ? currentDuplicateIndex : currentDuplicateIndex;
    const processTo = applyToAll ? importDuplicates.length : currentDuplicateIndex + 1;

    for (let i = processFrom; i < processTo; i++) {
      const dup = importDuplicates[i];
      let fileId: string;

      if (choice === 'existing' && dup.existingFileId) {
        fileId = dup.existingFileId;
      } else {
        // Upload as new
        const { data, error } = await supabase
          .from('songbook_files')
          .insert({
            title: dup.title,
            artist: dup.artist || null,
            content: dup.content,
            filename: dup.fileName,
          })
          .select('id')
          .single();

        if (error || !data) {
          console.error('Duplicate resolve upload error:', error);
          continue;
        }
        fileId = data.id;
      }

      // Find original position based on file order
      const allOriginal = [...importResolvedFiles, ...importDuplicates.map((d, idx) => ({
        fileId: '', position: idx + importResolvedFiles.length
      }))];
      
      await supabase
        .from('songbook_setlist_songs')
        .insert({
          setlist_id: pendingImportSetlistId,
          songbook_file_id: fileId,
          position: i + importResolvedFiles.length,
        });
    }

    if (applyToAll || currentDuplicateIndex >= importDuplicates.length - 1) {
      // Also add the non-duplicate files
      for (const rf of importResolvedFiles.sort((a, b) => a.position - b.position)) {
        await supabase
          .from('songbook_setlist_songs')
          .insert({
            setlist_id: pendingImportSetlistId,
            songbook_file_id: rf.fileId,
            position: rf.position,
          });
      }

      setShowImportDuplicates(false);
      setSelectedSetlistId(pendingImportSetlistId);
      setPendingImportSetlistId(null);
      toast.success('Scaletta importata con successo!');
    } else {
      setCurrentDuplicateIndex(prev => prev + 1);
      setDuplicateChoice(null);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-12 w-12">
            <Menu className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[min(90vw,400px)] p-0 flex flex-col h-full">
          <SheetHeader className="px-4 pt-4 pb-2 shrink-0">
            <SheetTitle className="text-lg">SongBook</SheetTitle>
          </SheetHeader>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-4 grid grid-cols-2 shrink-0">
              <TabsTrigger value="brani" className="gap-1.5">
                <Music className="w-4 h-4" />
                Brani
              </TabsTrigger>
              <TabsTrigger value="scalette" className="gap-1.5">
                <ListMusic className="w-4 h-4" />
                Scalette
              </TabsTrigger>
            </TabsList>

            {/* === BRANI TAB === */}
            <TabsContent value="brani" className="flex-1 flex flex-col mt-0 px-4 pb-4 min-h-0">
              <div className="py-3 space-y-2 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cerca brano..."
                    className="pl-9 h-10"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {(['title', 'artist', 'recent'] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={sortMode === mode ? 'default' : 'ghost'}
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => setSortMode(mode)}
                    >
                      {mode === 'title' ? 'Titolo' : mode === 'artist' ? 'Artista' : 'Recenti'}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-auto">
                <div className="space-y-0.5">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className="rounded-lg hover:bg-muted/50 active:bg-muted transition-colors px-2 py-1"
                    >
                      <div
                        className="flex items-center gap-1.5 cursor-pointer"
                        onClick={() => { onSelectFile(file); setOpen(false); }}
                      >
                        <Music className="w-3 h-3 text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium truncate leading-tight">{file.title}</p>
                          {file.artist && <p className="text-[10px] text-muted-foreground truncate leading-tight">{file.artist}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 mt-0.5 pl-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-1.5"
                          onClick={(e) => { e.stopPropagation(); onBroadcastFile(file); setOpen(false); }}
                        >
                          <Play className="w-2.5 h-2.5 mr-0.5" />
                          Avvia
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] px-1.5"
                          onClick={(e) => { e.stopPropagation(); onSelectFile(file); setOpen(false); }}
                        >
                          <Eye className="w-2.5 h-2.5 mr-0.5" />
                          Mostra
                        </Button>
                        {setlists.length > 0 && selectedSetlistId == null && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px] px-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (setlists.length === 1) {
                                addSongToFirstSetlist(file.id);
                              } else {
                                setTab('scalette');
                              }
                            }}
                          >
                            <Plus className="w-2.5 h-2.5 mr-0.5" />
                            Scaletta
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredFiles.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">Nessun brano trovato</p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* === SCALETTE TAB === */}
            <TabsContent value="scalette" className="flex-1 flex flex-col mt-0 px-4 pb-4 min-h-0">
              {!selectedSetlistId ? (
                // Setlist list
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="py-3 space-y-2 shrink-0">
                    <Button size="sm" className="w-full" onClick={() => setShowNewSetlist(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nuova Scaletta
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => importInputRef.current?.click()}
                      disabled={importing}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {importing ? 'Importazione...' : 'Importa da Cartella'}
                    </Button>
                    <input
                      ref={importInputRef}
                      type="file"
                      className="hidden"
                      // @ts-ignore webkitdirectory is non-standard
                      webkitdirectory=""
                      directory=""
                      multiple
                      onChange={handleImportFolder}
                    />
                  </div>
                  <div className="flex-1 min-h-0 overflow-auto">
                    <div className="space-y-2">
                      {setlists.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">Nessuna scaletta</p>
                          <p className="text-xs">Crea la tua prima scaletta SongBook</p>
                        </div>
                      ) : (
                        setlists.map((setlist) => (
                          <Card
                            key={setlist.id}
                            className="cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => setSelectedSetlistId(setlist.id)}
                          >
                            <CardContent className="p-3 flex items-center justify-between">
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{setlist.name}</p>
                                {setlist.description && (
                                  <p className="text-xs text-muted-foreground truncate">{setlist.description}</p>
                                )}
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-11 w-11 text-destructive shrink-0"
                                onClick={(e) => { e.stopPropagation(); deleteSetlist(setlist.id); }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Setlist detail with drag & drop
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="py-3 flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedSetlistId(null)}>
                      ← Indietro
                    </Button>
                    <span className="font-medium text-sm truncate flex-1">
                      {setlists.find(s => s.id === selectedSetlistId)?.name}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => setShowAddSong(true)}>
                      <Plus className="w-4 h-4 mr-1" />
                      Aggiungi
                    </Button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-auto">
                    {setlistSongs.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Music className="w-10 h-10 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Scaletta vuota</p>
                        <p className="text-xs">Aggiungi brani con il tasto +</p>
                      </div>
                    ) : (
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={setlistSongs.map(s => s.id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-2">
                            {setlistSongs.map((song, index) => (
                              <SortableSetlistItem
                                key={song.id}
                                id={song.id}
                                index={index}
                                title={song.file?.title || 'Brano sconosciuto'}
                                artist={song.file?.artist || ''}
                                isFirst={index === 0}
                                isLast={index === setlistSongs.length - 1}
                                onPlay={() => handlePlayFromSetlist(song)}
                                onPreview={() => handlePreviewFromSetlist(song)}
                                onRemove={() => removeSong(song.id)}
                                onMoveUp={() => handleMoveUp(index)}
                                onMoveDown={() => handleMoveDown(index)}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* New Setlist Dialog */}
      <Dialog open={showNewSetlist} onOpenChange={setShowNewSetlist}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuova Scaletta SongBook</DialogTitle>
          </DialogHeader>
          <Input
            value={newSetlistName}
            onChange={(e) => setNewSetlistName(e.target.value)}
            placeholder="Nome scaletta..."
            onKeyDown={(e) => e.key === 'Enter' && handleCreateSetlist()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSetlist(false)}>Annulla</Button>
            <Button onClick={handleCreateSetlist} disabled={!newSetlistName.trim()}>Crea</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Song to Setlist Dialog */}
      <Dialog open={showAddSong} onOpenChange={setShowAddSong}>
        <DialogContent className="max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Aggiungi Brano</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={addSearchQuery}
              onChange={(e) => setAddSearchQuery(e.target.value)}
              placeholder="Cerca brano..."
              className="pl-9"
            />
          </div>
          <ScrollArea className="flex-1 max-h-[400px]">
            <div className="space-y-1.5">
              {addSearchResults.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 p-3 rounded-lg hover:bg-muted/50 active:bg-muted cursor-pointer transition-colors min-h-[48px]"
                  onClick={async () => {
                    const ok = await addSong(file.id);
                    if (ok) toast.success(`"${file.title}" aggiunto`);
                  }}
                >
                  <Plus className="w-5 h-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{file.title}</p>
                    {file.artist && <p className="text-xs text-muted-foreground truncate">{file.artist}</p>}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Import Duplicate Resolution Dialog */}
      <Dialog open={showImportDuplicates} onOpenChange={(open) => { if (!open) { setShowImportDuplicates(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-accent" />
              Duplicato {currentDuplicateIndex + 1}/{importDuplicates.length}
            </DialogTitle>
          </DialogHeader>
          {importDuplicates[currentDuplicateIndex] && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-sm">{importDuplicates[currentDuplicateIndex].title}</p>
                <p className="text-xs text-muted-foreground">{importDuplicates[currentDuplicateIndex].artist || 'Artista sconosciuto'}</p>
                <p className="text-xs text-muted-foreground mt-1">File: {importDuplicates[currentDuplicateIndex].fileName}</p>
              </div>
              <p className="text-sm">Questo brano esiste già nel catalogo. Quale versione vuoi usare nella scaletta?</p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleResolveDuplicate('existing')}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Usa brano esistente
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleResolveDuplicate('new')}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importa come nuovo
                </Button>
              </div>
              {importDuplicates.length > 1 && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyToAll}
                    onChange={(e) => setApplyToAll(e.target.checked)}
                    className="rounded"
                  />
                  Vale per tutti i duplicati rimanenti
                </label>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
