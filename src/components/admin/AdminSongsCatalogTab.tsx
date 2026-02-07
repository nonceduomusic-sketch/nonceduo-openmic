import React, { useState, useMemo } from 'react';
import {
  Music,
  Search,
  Plus,
  Pencil,
  Trash2,
  ArrowUpAZ,
  ArrowDownAZ,
  RefreshCw,
  FileText,
  User,
  Calendar,
  Download,
  Trash,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSongs, Song, SongInput } from '@/hooks/useSongs';
import { AdminSongsImportCard } from './AdminSongsImportCard';

import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

type SortField = 'titolo' | 'artista' | 'created_at';
type SortDirection = 'asc' | 'desc';

export const AdminSongsCatalogTab: React.FC = () => {
  const { songs, loading, createSong, updateSong, deleteSong, deleteAllSongs, refetch } = useSongs();
  
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('titolo');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [deletingSong, setDeletingSong] = useState<Song | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<SongInput>({
    titolo: '',
    artista: '',
    testo: '',
  });

  // Filter and sort songs
  const filteredSongs = useMemo(() => {
    let result = songs.filter((song) => {
      const searchLower = search.toLowerCase();
      return (
        song.titolo.toLowerCase().includes(searchLower) ||
        song.artista.toLowerCase().includes(searchLower)
      );
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'titolo') {
        comparison = a.titolo.localeCompare(b.titolo, 'it');
      } else if (sortField === 'artista') {
        comparison = a.artista.localeCompare(b.artista, 'it');
      } else if (sortField === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [songs, search, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const openAddForm = () => {
    setEditingSong(null);
    setFormData({ titolo: '', artista: '', testo: '' });
    setIsFormOpen(true);
  };

  const openEditForm = (song: Song) => {
    setEditingSong(song);
    setFormData({
      titolo: song.titolo,
      artista: song.artista,
      testo: song.testo || '',
    });
    setIsFormOpen(true);
  };

  const openDeleteConfirm = (song: Song) => {
    setDeletingSong(song);
    setIsDeleteOpen(true);
  };

  const handleSave = async () => {
    if (!formData.titolo.trim() || !formData.artista.trim()) {
      return;
    }

    setSaving(true);
    try {
      if (editingSong) {
        const success = await updateSong(editingSong.id, formData);
        if (success) {
          setIsFormOpen(false);
        }
      } else {
        const success = await createSong(formData);
        if (success) {
          setIsFormOpen(false);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAll = async () => {
    if (songs.length === 0) return;
    
    setDeletingAll(true);
    const success = await deleteAllSongs();
    setDeletingAll(false);
    
    if (success) {
      setIsDeleteAllOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSong) return;

    const success = await deleteSong(deletingSong.id);
    if (success) {
      setIsDeleteOpen(false);
      setDeletingSong(null);
    }
  };

  const truncateText = (text: string | null, maxLength: number = 80): string => {
    if (!text) return '—';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '…';
  };

  // Export songs to CSV
  const handleExportCSV = () => {
    if (songs.length === 0) {
      toast.error('Nessuna canzone da esportare');
      return;
    }

    // Always quote and escape CSV fields for maximum compatibility
    const escapeCSV = (field: string | null): string => {
      if (!field) return '""';
      // Always wrap in quotes and escape internal quotes by doubling them
      return '"' + field.replace(/"/g, '""') + '"';
    };

    // Create CSV content with BOM for Excel compatibility
    const BOM = '\uFEFF';
    const headers = ['Titolo', 'Artista', 'Testo'];
    const rows = songs.map((song) => 
      [escapeCSV(song.titolo), escapeCSV(song.artista), escapeCSV(song.testo)].join(';')
    );

    const csvContent = BOM + [headers.join(';'), ...rows].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `catalogo-canzoni-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Esportate ${songs.length} canzoni in CSV`);
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
      {/* Import Card */}
      <AdminSongsImportCard />

      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Music className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Catalogo Canzoni</CardTitle>
                <CardDescription className="text-xs">
                  {songs.length} canzoni nel database
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button 
                onClick={() => setIsDeleteAllOpen(true)} 
                variant="outline" 
                className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50 hover:bg-destructive/10"
                disabled={songs.length === 0}
              >
                <Trash className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Elimina tutte</span>
              </Button>
              <Button onClick={handleExportCSV} variant="outline">
                <Download className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Esporta CSV</span>
              </Button>
              <Button onClick={openAddForm} className="neon-button-pink">
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Aggiungi</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Search and Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per titolo o artista..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="shrink-0">
                  {sortDirection === 'asc' ? (
                    <ArrowUpAZ className="w-4 h-4 mr-2" />
                  ) : (
                    <ArrowDownAZ className="w-4 h-4 mr-2" />
                  )}
                  Ordina: {sortField === 'titolo' ? 'Titolo' : sortField === 'artista' ? 'Artista' : 'Data'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSort('titolo')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Per Titolo {sortField === 'titolo' && (sortDirection === 'asc' ? '(A-Z)' : '(Z-A)')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('artista')}>
                  <User className="w-4 h-4 mr-2" />
                  Per Artista {sortField === 'artista' && (sortDirection === 'asc' ? '(A-Z)' : '(Z-A)')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('created_at')}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Per Data {sortField === 'created_at' && (sortDirection === 'asc' ? '(Vecchie prima)' : '(Nuove prima)')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>


      {/* Songs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-[30%]">Titolo</TableHead>
                  <TableHead className="w-[20%]">Artista</TableHead>
                  <TableHead className="w-[35%] hidden md:table-cell">Anteprima Testo</TableHead>
                  <TableHead className="w-[10%] hidden lg:table-cell">Data</TableHead>
                  <TableHead className="w-[5%] text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSongs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-muted-foreground">
                        {search ? 'Nessuna canzone trovata' : 'Nessuna canzone nel catalogo'}
                      </p>
                      {!search && (
                        <Button onClick={openAddForm} variant="outline" className="mt-3">
                          <Plus className="w-4 h-4 mr-2" />
                          Aggiungi la prima canzone
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSongs.map((song) => (
                    <TableRow
                      key={song.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => openEditForm(song)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[200px]">{song.titolo}</span>
                          {song.testo && (
                            <Badge variant="secondary" className="text-[10px] px-1.5">
                              <FileText className="w-3 h-3" />
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <span className="truncate max-w-[150px] block">{song.artista}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {truncateText(song.testo, 100)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {format(new Date(song.created_at), 'dd MMM yyyy', { locale: it })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditForm(song)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => openDeleteConfirm(song)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSong ? 'Modifica Canzone' : 'Aggiungi Canzone'}
            </DialogTitle>
            <DialogDescription>
              {editingSong
                ? 'Modifica i dettagli della canzone'
                : 'Inserisci i dettagli della nuova canzone'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="titolo">Titolo *</Label>
              <Input
                id="titolo"
                value={formData.titolo}
                onChange={(e) => setFormData((prev) => ({ ...prev, titolo: e.target.value }))}
                placeholder="Es: Viva la Vida"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="artista">Artista *</Label>
              <Input
                id="artista"
                value={formData.artista}
                onChange={(e) => setFormData((prev) => ({ ...prev, artista: e.target.value }))}
                placeholder="Es: Coldplay"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="testo">Testo *</Label>
              <Textarea
                id="testo"
                value={formData.testo}
                onChange={(e) => setFormData((prev) => ({ ...prev, testo: e.target.value }))}
                placeholder="Incolla qui il testo completo della canzone..."
                className="min-h-[300px] font-mono text-sm"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.titolo.trim() || !formData.artista.trim()}
              className="neon-button-pink"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                'Salva'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa canzone?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare "{deletingSong?.titolo}" di {deletingSong?.artista}.
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={isDeleteAllOpen} onOpenChange={setIsDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">⚠️ Eliminare TUTTE le canzoni?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Stai per eliminare <strong>{songs.length} canzoni</strong> dal catalogo.</p>
              <p className="font-semibold text-destructive">Questa azione è irreversibile!</p>
              <p>Ti consigliamo di esportare il catalogo in CSV prima di procedere.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAll}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={deletingAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingAll ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <Trash className="w-4 h-4 mr-2" />
                  Sì, elimina tutte
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
