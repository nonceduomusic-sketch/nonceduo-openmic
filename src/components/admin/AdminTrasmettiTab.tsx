import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
import { useBroadcastSetlists, useBroadcastSetlistSongs } from '@/hooks/useBroadcast';
import { useHybridBroadcast } from '@/hooks/useHybridBroadcast';
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
  Guitar,
  ChevronDown,
  FileText,
  CheckCircle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { BroadcastTVSettings } from './BroadcastTVSettings';
import { TVPreviewDialog } from './TVPreviewDialog';
import { SetlistSongItem } from './SetlistSongItem';
import { LiveBroadcastPreview } from './LiveBroadcastPreview';
import { SongbookTab } from './SongbookTab';
import { BroadcastRemoteSection } from './BroadcastRemoteSection';
import { BroadcastLinksCards } from './LocalLinksCard';
import { useBroadcastRemoteAdmin } from '@/hooks/useBroadcastRemote';
import { LyricsDialog } from '@/components/LyricsDialog';
import { STANDBY_MODE_OPTIONS, resolveStandbyMode, STANDBY_QR_URLS, STANDBY_DEFAULTS, type StandbyMode } from '@/lib/tvStandbyModes';

interface AdminTrasmettiTabProps {
  canManage?: boolean;
  canFull?: boolean;
}

export function AdminTrasmettiTab({ canManage = true, canFull = true }: AdminTrasmettiTabProps) {
  const navigate = useNavigate();
  const { session, broadcastSong, stopBroadcast, toggleActive, syncUpdate } = useHybridBroadcast('main');
  const { activeReservations, completeReservation } = useReservations();
  const { songs } = useSongs();
  const currentBroadcastSongId = session?.current_song_id || null;
  const { setlists, createSetlist, updateSetlist, deleteSetlist } = useBroadcastSetlists();
  const { accesses: remoteAccesses } = useBroadcastRemoteAdmin();
  const [furoreRemoteToken, setFuroreRemoteToken] = useState<string | null>(null);
  const [lyricsDialogOpen, setLyricsDialogOpen] = useState(false);
  const [lyricsDialogSong, setLyricsDialogSong] = useState<{ title: string; artist: string }>({ title: '', artist: '' });

  // Fetch furore remote token
  useEffect(() => {
    supabase
      .from('furore_remote_access')
      .select('access_token')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setFuroreRemoteToken(data.access_token);
      });
  }, []);
  
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
              <Button variant="outline" size="sm" onClick={() => window.open('/partiture', '_blank')}>
                <Guitar className="w-4 h-4 mr-2" />
                Partiture
              </Button>
              <Button variant="default" size="sm" onClick={() => window.open('/songbook-live', '_blank')}>
                <Music className="w-4 h-4 mr-2" />
                Apri SongBook
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
            <div className="flex items-center justify-between gap-3 p-4 bg-muted/50 rounded-xl flex-wrap">
              <div className="flex items-center gap-3">
                <QrCode className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">
                  Schermata di attesa attiva
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Monitor className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {STANDBY_MODE_OPTIONS.find(o => o.value === resolveStandbyMode((session as any)?.tv_standby_mode))?.label || 'Open Mic'}
                    </span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {STANDBY_MODE_OPTIONS.map((opt) => {
                    const isActive = resolveStandbyMode((session as any)?.tv_standby_mode) === opt.value;
                    return (
                      <DropdownMenuItem
                        key={opt.value}
                        className={cn("flex flex-col items-start gap-0.5 py-2.5", isActive && "bg-primary/10")}
                        onClick={async () => {
                          const defaults = STANDBY_DEFAULTS[opt.value];
                          const qrUrl = STANDBY_QR_URLS[opt.value];
                          const updatePayload: Record<string, any> = {
                            tv_standby_mode: opt.value,
                            updated_at: new Date().toISOString(),
                          };
                          // Apply mode defaults for title/subtitle/qr
                          if (defaults.title) updatePayload.tv_title = defaults.title;
                          if (defaults.subtitle) updatePayload.tv_subtitle = defaults.subtitle;
                          if (defaults.qrCta) updatePayload.tv_qr_cta = defaults.qrCta;
                          if (qrUrl) updatePayload.tv_qr_url = qrUrl;
                          // Toggle QR visibility
                          updatePayload.tv_show_qr = !!qrUrl;

                          // For logo mode: hide title/subtitle/status since it's logo-only
                          if (opt.value === 'logo') {
                            updatePayload.tv_show_title = false;
                            updatePayload.tv_show_subtitle = false;
                            updatePayload.tv_show_status = false;
                          }
                          // For modes with QR: ensure all elements are visible
                          if (opt.value === 'openmic' || opt.value === 'furore_qr' || opt.value === 'app') {
                            updatePayload.tv_show_logo = true;
                            updatePayload.tv_show_title = true;
                            updatePayload.tv_show_subtitle = true;
                            updatePayload.tv_show_footer = true;
                          }

                          await syncUpdate(updatePayload);
                          toast.success(`Schermata: ${opt.label}`);
                        }}
                      >
                        <span className="font-medium text-sm">{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.desc}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Broadcast Links: Online + Local - ALL links centralized here */}
      <BroadcastLinksCards 
        telecomandoTokens={remoteAccesses.filter(a => a.is_active).map(a => ({ name: a.name, token: a.access_token }))}
        furoreRemoteToken={furoreRemoteToken || undefined}
      />

      {/* Main content tabs */}
      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 h-auto p-1.5 gap-1">
          <TabsTrigger value="queue" className="flex-col gap-1 py-2.5 sm:py-3 px-1.5 sm:px-2 text-[10px] sm:text-xs md:text-sm lg:text-base font-semibold">
            <List className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="leading-tight text-center whitespace-nowrap">Scaletta</span>
          </TabsTrigger>
          <TabsTrigger value="catalog" className="flex-col gap-1 py-2.5 sm:py-3 px-1.5 sm:px-2 text-[10px] sm:text-xs md:text-sm lg:text-base font-semibold">
            <Music className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="leading-tight text-center whitespace-nowrap">Catalogo</span>
          </TabsTrigger>
          <TabsTrigger value="setlists" className="flex-col gap-1 py-2.5 sm:py-3 px-1.5 sm:px-2 text-[10px] sm:text-xs md:text-sm lg:text-base font-semibold">
            <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="leading-tight text-center whitespace-nowrap">Scalette</span>
          </TabsTrigger>
          <TabsTrigger value="songbook" className="flex-col gap-1 py-2.5 sm:py-3 px-1.5 sm:px-2 text-[10px] sm:text-xs md:text-sm lg:text-base font-semibold">
            <Guitar className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="leading-tight text-center whitespace-nowrap">SongBook</span>
          </TabsTrigger>
          <TabsTrigger value="remote" className="flex-col gap-1 py-2.5 sm:py-3 px-1.5 sm:px-2 text-[10px] sm:text-xs md:text-sm lg:text-base font-semibold">
            <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="leading-tight text-center whitespace-nowrap">Remote</span>
          </TabsTrigger>
          <TabsTrigger value="tv-settings" className="flex-col gap-1 py-2.5 sm:py-3 px-1.5 sm:px-2 text-[10px] sm:text-xs md:text-sm lg:text-base font-semibold">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="leading-tight text-center whitespace-nowrap">TV</span>
          </TabsTrigger>
        </TabsList>

        {/* Live Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Music className="w-5 h-5" />
                Prenotazioni da Completare ({pendingReservations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingReservations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm sm:text-base">
                  Nessuna prenotazione in coda
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingReservations.map((reservation, index) => (
                    <div
                      key={reservation.id}
                      className="flex items-center justify-between p-3 sm:p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Badge variant="outline" className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-sm sm:text-base font-semibold shrink-0">
                          {index + 1}
                        </Badge>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm sm:text-base truncate">{reservation.song_title}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {reservation.song_artist} • {reservation.customer_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {/* Testo / Accordi */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setLyricsDialogSong({ title: reservation.song_title, artist: reservation.song_artist });
                            setLyricsDialogOpen(true);
                          }}
                          className="h-9 sm:h-10 px-2 sm:px-3 text-xs sm:text-sm border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
                        >
                          <FileText className="w-4 h-4 sm:mr-1.5 flex-shrink-0" />
                          <span className="hidden lg:inline">Testo</span>
                        </Button>

                        {/* Trasmetti / Stop */}
                        {(() => {
                          const song = songs.find(s => 
                            s.titolo === reservation.song_title && s.artista === reservation.song_artist
                          );
                          const isBroadcasting = !!song && currentBroadcastSongId === song.id;
                          return (
                            <Button
                              size="sm"
                              variant={isBroadcasting ? "destructive" : "default"}
                              onClick={() => {
                                if (song) {
                                  if (isBroadcasting) {
                                    stopBroadcast();
                                    toast.success('Trasmissione interrotta');
                                  } else {
                                    handleBroadcast(song.id, reservation.id);
                                  }
                                } else {
                                  toast.error('Canzone non trovata nel catalogo');
                                }
                              }}
                              disabled={!canManage}
                              className={cn(
                                "h-9 sm:h-10 px-2 sm:px-3 text-xs sm:text-sm",
                                !isBroadcasting && "bg-primary hover:bg-primary/90"
                              )}
                            >
                              {isBroadcasting ? (
                                <Square className="w-4 h-4 sm:mr-1.5 flex-shrink-0" />
                              ) : (
                                <Play className="w-4 h-4 sm:mr-1.5 flex-shrink-0" />
                              )}
                              <span className="hidden lg:inline">{isBroadcasting ? 'Stop' : 'Trasmetti'}</span>
                            </Button>
                          );
                        })()}

                        {/* Completa */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const success = await completeReservation(reservation.id);
                            if (success) {
                              toast.success(`${reservation.song_title} completata!`);
                            }
                          }}
                          disabled={!canManage}
                          className="h-9 sm:h-10 px-2 sm:px-3 text-xs sm:text-sm border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                        >
                          <CheckCircle className="w-4 h-4 sm:mr-1.5 flex-shrink-0" />
                          <span className="hidden lg:inline">Completa</span>
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
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base sm:text-lg">Catalogo Canzoni ({songs.length})</CardTitle>
                {selectedSetlistId && (
                  <Badge variant="secondary" className="text-xs sm:text-sm">
                    Scaletta selezionata - clicca + per aggiungere
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                <Input
                  placeholder="Filtra per titolo o artista..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 sm:pl-11 h-11 sm:h-12 text-sm sm:text-base"
                />
              </div>

              <ScrollArea className="h-[400px] sm:h-[500px]">
                <div className="space-y-2 sm:space-y-3">
                  {filteredSongs.map((song) => (
                    <div
                      key={song.id}
                      className="flex items-center justify-between p-3 sm:p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm sm:text-base truncate max-w-[200px] sm:max-w-none">{song.titolo}</p>
                          {song.testo && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2 shrink-0">Testo</Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{song.artista}</p>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => openPreview(song.id)}
                          className="h-10 w-10 sm:h-11 sm:w-11 min-w-[40px] min-h-[40px]"
                          title="Anteprima"
                        >
                          <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                        {selectedSetlistId && canFull && (
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => addToSetlist(song.id)}
                            className="h-10 w-10 sm:h-11 sm:w-11 min-w-[40px] min-h-[40px]"
                            title="Aggiungi a scaletta"
                          >
                            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          onClick={() => handleBroadcast(song.id)}
                          disabled={!canManage}
                          className="h-10 w-10 sm:h-11 sm:w-11 min-w-[40px] min-h-[40px] bg-primary"
                          title="Trasmetti"
                        >
                          <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {filteredSongs.length === 0 && (
                <p className="text-muted-foreground text-center py-8 text-sm sm:text-base">
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
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg">Scalette Salvate</CardTitle>
                  {canFull && (
                    <Dialog open={showNewSetlistDialog} onOpenChange={setShowNewSetlistDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-10 sm:h-11 px-3 sm:px-4 text-sm sm:text-base">
                          <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                          Nuova
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="text-lg sm:text-xl">Crea Nuova Scaletta</DialogTitle>
                          <DialogDescription className="text-sm sm:text-base">
                            Dai un nome alla tua nuova scaletta
                          </DialogDescription>
                        </DialogHeader>
                        <Input
                          placeholder="Nome scaletta..."
                          value={newSetlistName}
                          onChange={(e) => setNewSetlistName(e.target.value)}
                          className="h-11 sm:h-12 text-sm sm:text-base"
                        />
                        <DialogFooter>
                          <Button onClick={handleCreateSetlist} disabled={!newSetlistName.trim()} className="h-10 sm:h-11">
                            <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
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
                  <p className="text-muted-foreground text-center py-8 text-sm sm:text-base">
                    Nessuna scaletta salvata
                  </p>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
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
                        <div className="flex items-center gap-2 sm:gap-3">
                          <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                          <span className="font-semibold text-sm sm:text-base">{setlist.name}</span>
                        </div>
                        {canFull && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 sm:h-10 sm:w-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSetlist({ id: setlist.id, name: setlist.name });
                              }}
                            >
                              <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-9 w-9 sm:h-10 sm:w-10 text-destructive"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-lg sm:text-xl">Elimina Scaletta</AlertDialogTitle>
                                  <AlertDialogDescription className="text-sm sm:text-base">
                                    Sei sicuro di voler eliminare "{setlist.name}"?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="h-10 sm:h-11">Annulla</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteSetlist(setlist.id)}
                                    className="bg-destructive text-destructive-foreground h-10 sm:h-11"
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
              <CardHeader className="pb-4">
                <CardTitle className="text-base sm:text-lg">
                  {selectedSetlistId
                    ? setlists.find(s => s.id === selectedSetlistId)?.name || 'Scaletta'
                    : 'Seleziona una Scaletta'}
                </CardTitle>
                {selectedSetlistId && setlistSongs.length > 0 && canFull && (
                  <CardDescription className="text-xs sm:text-sm">
                    Trascina per riordinare le canzoni
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {!selectedSetlistId ? (
                  <p className="text-muted-foreground text-center py-8 text-sm sm:text-base">
                    Seleziona una scaletta per vedere le canzoni
                  </p>
                ) : setlistSongs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 text-sm sm:text-base">
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
                      <div className="space-y-2 sm:space-y-3">
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

        {/* SongBook Tab */}
        <TabsContent value="songbook" className="space-y-4">
          <SongbookTab canManage={canManage} canFull={canFull} />
        </TabsContent>

        {/* Remote Control Tab */}
        <TabsContent value="remote" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <BroadcastRemoteSection />
            </CardContent>
          </Card>
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
