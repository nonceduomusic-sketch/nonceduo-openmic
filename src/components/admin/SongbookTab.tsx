import React, { useState, useMemo, useRef, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  Search, 
  Trash2, 
  Edit2,
  Music,
  Guitar,
  ExternalLink,
  AlertTriangle,
  X,
  Save,
  FolderOpen,
  Plus,
  Eye,
  Play,
  ArrowUpDown,
  Sparkles,
  ArrowRightLeft,
  Download,
  CheckSquare,
  Square,
  PackagePlus,
  Link,
  Loader2,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useHybridBroadcast } from '@/hooks/useHybridBroadcast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useSongbookFiles, useSongbookSetlists, useSongbookSetlistSongs, SongbookFile } from '@/hooks/useSongbook';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';
import { parseChordPro, renderWithChords, renderLyricsOnly } from '@/lib/chordpro';
import { toast } from 'sonner';
import { SongbookSetlistsTab } from './SongbookSetlistsTab';
import { CatalogSongbookCompare } from './CatalogSongbookCompare';
import { SongbookAdvancedSearch } from './SongbookAdvancedSearch';
import { BroadcastLinksCards } from './LocalLinksCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import JSZip from 'jszip';

type SortMode = 'title-asc' | 'title-desc' | 'artist-asc' | 'artist-desc';

interface SongbookTabProps {
  canManage?: boolean;
  canFull?: boolean;
}

export function SongbookTab({ canManage = true, canFull = true }: SongbookTabProps) {
  const { files, loading, uploadFiles, importFromUrl, updateFile, deleteFile, deleteAllFiles } = useSongbookFiles();
  const { setlists, createSetlist } = useSongbookSetlists();
  const { syncUpdate } = useHybridBroadcast('main');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('title-asc');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filterUnderscore, setFilterUnderscore] = useState<'all' | 'only_' | 'no_'>('all');
  const [isDragging, setIsDragging] = useState(false);
  const [editingFile, setEditingFile] = useState<SongbookFile | null>(null);
  const [editContent, setEditContent] = useState('');
  const [previewFile, setPreviewFile] = useState<SongbookFile | null>(null);
  const [showChordsInPreview, setShowChordsInPreview] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  
  // Import from URL state
  const [importUrl, setImportUrl] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState(() => safeGetItem('local', 'google_api_key') || '');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; duplicates: number; errors: string[] } | null>(null);
  // Import destination state
  const [importDestination, setImportDestination] = useState<'catalog' | 'catalog_existing' | 'catalog_new'>('catalog');
  const [importSetlistId, setImportSetlistId] = useState<string>('');
  const [newSetlistName, setNewSetlistName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredFiles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFiles.map(f => f.id)));
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const exportChoFiles = async (filesToExport: SongbookFile[]) => {
    if (filesToExport.length === 1) {
      // Single file download
      const f = filesToExport[0];
      const blob = new Blob([f.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.filename || `${f.title}.cho`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`"${f.title}" esportato`);
    } else {
      // Multiple files: create ZIP
      const zip = new JSZip();
      for (const f of filesToExport) {
        const filename = f.filename || `${f.title}.cho`;
        zip.file(filename, f.content);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const date = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `songbook_export_${date}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${filesToExport.length} file esportati in ZIP`);
    }
  };

  const handleExportSelected = () => {
    const toExport = files.filter(f => selectedIds.has(f.id));
    if (toExport.length === 0) {
      toast.warning('Nessun file selezionato');
      return;
    }
    exportChoFiles(toExport);
  };

  const handleExportAll = () => {
    exportChoFiles(files);
  };

  // Broadcast a file directly from catalog to TV
  const handleBroadcastFile = (file: SongbookFile) => {
    syncUpdate({
      songbook_mode: true,
      songbook_file_id: file.id,
      songbook_show_chords_on_tv: false,
      songbook_transpose: 0,
      display_mode: 'lyrics',
      is_active: true,
      is_broadcasting: true,
    });
    toast.success(`"${file.title}" in trasmissione su TV!`);
  };

  // Filtered and sorted files
  const filteredFiles = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    let result = files.filter(f => 
      f.title.toLowerCase().includes(query) || 
      (f.artist || '').toLowerCase().includes(query)
    );

    // Underscore filter
    if (filterUnderscore === 'only_') {
      result = result.filter(f => f.title.trim().endsWith('_'));
    } else if (filterUnderscore === 'no_') {
      result = result.filter(f => !f.title.trim().endsWith('_'));
    }

    // Sort
    return result.sort((a, b) => {
      switch (sortMode) {
        case 'title-asc': return a.title.localeCompare(b.title);
        case 'title-desc': return b.title.localeCompare(a.title);
        case 'artist-asc': return (a.artist || '').localeCompare(b.artist || '');
        case 'artist-desc': return (b.artist || '').localeCompare(a.artist || '');
        default: return a.title.localeCompare(b.title);
      }
    });
  }, [files, searchQuery, sortMode, filterUnderscore]);

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleImportWithDestination = useCallback(async (fileList: FileList | File[]) => {
    setUploadProgress({ current: 0, total: Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.cho')).length });
    
    const count = await uploadFiles(fileList, (current, total) => {
      setUploadProgress({ current, total });
    });
    
    setUploadProgress(null);
    
    if (count > 0 && importDestination !== 'catalog') {
      // After upload, get the newly uploaded file IDs by matching filenames
      const uploadedNames = Array.from(fileList)
        .filter(f => f.name.toLowerCase().endsWith('.cho'))
        .map(f => f.name);
      
      // Wait a moment for realtime to update, then find the files
      await new Promise(r => setTimeout(r, 500));
      
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: newFiles } = await supabase
          .from('songbook_files')
          .select('id, filename')
          .in('filename', uploadedNames);
        
        if (newFiles && newFiles.length > 0) {
          let targetSetlistId = importSetlistId;
          
          if (importDestination === 'catalog_new') {
            const name = newSetlistName.trim() || `Scaletta ${new Date().toLocaleDateString('it')}`;
            const newSetlist = await createSetlist(name);
            if (newSetlist) targetSetlistId = newSetlist.id;
          }
          
          if (targetSetlistId) {
            for (let i = 0; i < newFiles.length; i++) {
              await supabase.from('songbook_setlist_songs').insert({
                setlist_id: targetSetlistId,
                songbook_file_id: newFiles[i].id,
                position: i,
              });
            }
            toast.success(`${newFiles.length} brani aggiunti alla scaletta`);
          }
        }
      } catch (err) {
        console.error('Error adding to setlist:', err);
      }
    }
  }, [uploadFiles, importDestination, importSetlistId, newSetlistName, createSetlist]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!canFull) {
      toast.error('Non hai i permessi per caricare file');
      return;
    }
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      await handleImportWithDestination(droppedFiles);
    }
  }, [canFull, handleImportWithDestination]);

  const handleImportFromUrl = useCallback(async () => {
    if (!importUrl.trim()) {
      toast.warning('Inserisci un URL');
      return;
    }
    setIsImporting(true);
    setImportResult(null);
    try {
      // Save Google API key for reuse
      if (googleApiKey) safeSetItem('local', 'google_api_key', googleApiKey);
      const result = await importFromUrl(importUrl.trim(), googleApiKey || undefined);
      setImportResult(result);
      if (result.imported > 0) setImportUrl('');
    } catch {
      // error already shown by toast in importFromUrl
    } finally {
      setIsImporting(false);
    }
  }, [importUrl, googleApiKey, importFromUrl]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canFull) return;
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      await handleImportWithDestination(selectedFiles);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [canFull, handleImportWithDestination]);

  const handleEdit = (file: SongbookFile) => {
    setEditingFile(file);
    setEditContent(file.content);
  };

  const handleSaveEdit = async () => {
    if (!editingFile) return;
    
    // Re-extract title/artist from updated content
    const parsed = parseChordPro(editContent);
    
    await updateFile(editingFile.id, {
      content: editContent,
      title: parsed.title || editingFile.title,
      artist: parsed.artist || editingFile.artist,
    });
    
    setEditingFile(null);
    setEditContent('');
  };

  const handlePreview = (file: SongbookFile) => {
    setPreviewFile(file);
  };

  const openSongbookLive = () => {
    window.open('/songbook-live', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Guitar className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">SongBook</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Gestisci file ChordPro (.cho)</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs sm:text-sm">{files.length} file</Badge>
              <Button onClick={openSongbookLive} variant="outline" size="sm" className="h-10 sm:h-11 text-sm sm:text-base">
                <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span className="hidden sm:inline">Apri </span>SongBookLive
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="catalog" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1.5 gap-1">
          <TabsTrigger value="catalog" className="flex items-center justify-center gap-2 py-3 px-3 text-sm sm:text-base md:text-lg font-semibold">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="whitespace-nowrap">Catalogo</span>
          </TabsTrigger>
          <TabsTrigger value="setlists" className="flex items-center justify-center gap-2 py-3 px-3 text-sm sm:text-base md:text-lg font-semibold">
            <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="whitespace-nowrap">Scalette</span>
          </TabsTrigger>
          <TabsTrigger value="compare" className="flex items-center justify-center gap-2 py-3 px-3 text-sm sm:text-base md:text-lg font-semibold">
            <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="whitespace-nowrap">Confronto</span>
          </TabsTrigger>
        </TabsList>

        {/* Catalog Tab */}
        <TabsContent value="catalog" className="space-y-4">
          {/* Upload Zone */}
          <Card
            className={cn(
              "border-2 border-dashed transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <CardContent className="py-6 sm:py-8">
              <div 
                className="flex flex-col items-center justify-center text-center cursor-pointer"
                onClick={() => canFull && fileInputRef.current?.click()}
              >
                <Upload className={cn(
                  "w-8 h-8 sm:w-10 sm:h-10 mb-3 transition-colors",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )} />
                <p className="text-sm sm:text-base font-medium">
                  {isDragging ? "Rilascia i file qui" : "Trascina file .cho oppure clicca per selezionare"}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Supporta upload multiplo (.cho e .zip)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".cho,.zip"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {/* Import destination selector */}
              <div className="mt-4 pt-4 border-t border-border space-y-3" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <PackagePlus className="w-4 h-4" />
                  Destinazione Import
                </div>
                <Select value={importDestination} onValueChange={(v: any) => setImportDestination(v)}>
                  <SelectTrigger className="h-10 sm:h-11 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="catalog">Solo Catalogo SongBook</SelectItem>
                    <SelectItem value="catalog_existing">Catalogo + Scaletta esistente</SelectItem>
                    <SelectItem value="catalog_new">Catalogo + Nuova Scaletta</SelectItem>
                  </SelectContent>
                </Select>
                
                {importDestination === 'catalog_existing' && (
                  <Select value={importSetlistId} onValueChange={setImportSetlistId}>
                    <SelectTrigger className="h-10 sm:h-11 text-sm">
                      <SelectValue placeholder="Seleziona scaletta..." />
                    </SelectTrigger>
                    <SelectContent>
                      {setlists.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                {importDestination === 'catalog_new' && (
                  <Input
                    placeholder="Nome nuova scaletta..."
                    value={newSetlistName}
                    onChange={e => setNewSetlistName(e.target.value)}
                    className="h-10 sm:h-11 text-sm"
                  />
                )}
              </div>
              
              {/* Upload progress bar */}
              {uploadProgress && (
                <div className="mt-4 pt-4 border-t border-border space-y-2" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Caricamento in corso...</span>
                    <span className="text-muted-foreground">
                      {uploadProgress.current}/{uploadProgress.total} ({Math.round((uploadProgress.current / uploadProgress.total) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Import from URL */}
          {canFull && (
            <Card>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Link className="w-4 h-4" />
                  Importa da URL (Google Drive, ZIP, .cho)
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://drive.google.com/drive/folders/... oppure URL a .zip/.cho"
                    value={importUrl}
                    onChange={e => setImportUrl(e.target.value)}
                    className="h-10 sm:h-11 text-sm flex-1"
                    disabled={isImporting}
                  />
                  <Button onClick={handleImportFromUrl} disabled={isImporting || !importUrl.trim()} className="h-10 sm:h-11">
                    {isImporting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Download className="w-4 h-4 mr-1.5" />}
                    Importa
                  </Button>
                </div>
                {importUrl.includes('drive.google.com') && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Google API Key (necessaria per Google Drive)</Label>
                    <Input
                      placeholder="AIza..."
                      value={googleApiKey}
                      onChange={e => setGoogleApiKey(e.target.value)}
                      className="h-9 text-xs font-mono"
                      type="password"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Ottienila da console.cloud.google.com → API & Services → Credentials → Abilita Google Drive API
                    </p>
                  </div>
                )}
                {importResult && (
                  <div className="text-sm space-y-1 p-3 bg-muted/50 rounded-lg">
                    <p>✅ Importati: <strong>{importResult.imported}</strong> | Duplicati: {importResult.duplicates}</p>
                    {importResult.errors.length > 0 && (
                      <details className="text-xs text-destructive">
                        <summary className="cursor-pointer">{importResult.errors.length} errori</summary>
                        <ul className="mt-1 space-y-0.5 max-h-32 overflow-auto">
                          {importResult.errors.map((e, i) => <li key={i}>• {e}</li>)}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Broadcast page links - always visible */}
          <BroadcastLinksCards filter={['tv', 'partiture', 'songbook']} />
          <Card>
             <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  <Input
                    placeholder="Cerca per titolo o artista..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 sm:pl-11 h-11 sm:h-12 text-sm sm:text-base"
                  />
                </div>
                <Badge variant="secondary" className="text-xs sm:text-sm shrink-0">
                  {searchQuery || filterUnderscore !== 'all' ? `${filteredFiles.length} / ` : ''}{files.length} file
                </Badge>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Sort dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-10 sm:h-11 text-sm">
                        <ArrowUpDown className="w-4 h-4 mr-1.5" />
                        <span className="hidden sm:inline">
                          {sortMode === 'title-asc' ? 'Titolo A→Z' :
                           sortMode === 'title-desc' ? 'Titolo Z→A' :
                           sortMode === 'artist-asc' ? 'Artista A→Z' : 'Artista Z→A'}
                        </span>
                        <span className="sm:hidden">Ordina</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSortMode('title-asc')}>Titolo A → Z</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortMode('title-desc')}>Titolo Z → A</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortMode('artist-asc')}>Artista A → Z</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortMode('artist-desc')}>Artista Z → A</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Underscore filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant={filterUnderscore !== 'all' ? 'default' : 'outline'} size="sm" className="h-10 sm:h-11 text-sm">
                        <span className="font-mono mr-1">_</span>
                        <span className="hidden sm:inline">
                          {filterUnderscore === 'all' ? 'Tutti' : filterUnderscore === 'only_' ? 'Solo con _' : 'Senza _'}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setFilterUnderscore('all')}>Tutti i file</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterUnderscore('only_')}>Solo con _ (corretti)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterUnderscore('no_')}>Senza _ (non corretti)</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Advanced search */}
                  <Button variant="outline" size="sm" className="h-10 sm:h-11 text-sm" onClick={() => setShowAdvanced(true)}>
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Avanzata</span>
                  </Button>

                  {/* Select / Export */}
                  {files.length > 0 && (
                    <>
                      {!selectionMode ? (
                        <Button variant="outline" size="sm" className="h-10 sm:h-11 text-sm" onClick={() => setSelectionMode(true)}>
                          <CheckSquare className="w-4 h-4 mr-1.5" />
                          <span className="hidden sm:inline">Seleziona</span>
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Button variant="outline" size="sm" className="h-10 sm:h-11 text-sm" onClick={toggleSelectAll}>
                            {selectedIds.size === filteredFiles.length ? <CheckSquare className="w-4 h-4 mr-1.5" /> : <Square className="w-4 h-4 mr-1.5" />}
                            {selectedIds.size === filteredFiles.length ? 'Deseleziona' : 'Tutti'}
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-10 sm:h-11 text-sm" 
                            onClick={handleExportSelected}
                            disabled={selectedIds.size === 0}
                          >
                            <Download className="w-4 h-4 mr-1.5" />
                            Export {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-10 sm:h-11 text-sm" onClick={exitSelectionMode}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      {!selectionMode && (
                        <Button variant="outline" size="sm" className="h-10 sm:h-11 text-sm" onClick={handleExportAll}>
                          <Download className="w-4 h-4 mr-1.5" />
                          <span className="hidden sm:inline">Export tutti</span>
                          <span className="sm:hidden">Export</span>
                        </Button>
                      )}
                    </>
                  )}

                  {canFull && files.length > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="h-10 sm:h-11 text-sm sm:text-base">
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          <span className="hidden sm:inline">Elimina tutti</span>
                          <span className="sm:hidden">Elimina</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-destructive" />
                            Eliminare tutti i file?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-sm sm:text-base">
                            Questa azione eliminerà permanentemente tutti i {files.length} file ChordPro.
                            L'operazione non può essere annullata.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="h-10 sm:h-11">Annulla</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={deleteAllFiles}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 sm:h-11"
                          >
                            Elimina tutti
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
              {/* Active filter info */}
              {(filterUnderscore !== 'all' || searchQuery) && (
                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                  <span>{filteredFiles.length} risultati</span>
                  {filterUnderscore !== 'all' && (
                    <Badge variant="secondary" className="text-xs">
                      {filterUnderscore === 'only_' ? 'Solo corretti (_)' : 'Solo non corretti'}
                    </Badge>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground text-sm sm:text-base">
                  Caricamento...
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm sm:text-base">
                  {files.length === 0 
                    ? "Nessun file caricato. Trascina dei file .cho per iniziare."
                    : "Nessun file corrisponde alla ricerca"}
                </div>
              ) : (
                <ScrollArea className="h-[400px] sm:h-[500px] md:h-[550px]">
                  <div className="space-y-2 sm:space-y-3 md:space-y-4">
                    {filteredFiles.map((file) => (
                      <div
                        key={file.id}
                        className={cn(
                          "p-3 sm:p-4 rounded-xl hover:bg-muted/50 transition-colors space-y-2.5",
                          file.is_variant ? "bg-muted/20" : "bg-muted/30"
                        )}
                      >
                        {/* Title row */}
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          {selectionMode && (
                            <Checkbox
                              checked={selectedIds.has(file.id)}
                              onCheckedChange={() => toggleSelect(file.id)}
                              className="shrink-0"
                            />
                          )}
                          <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-sm sm:text-base truncate">{file.title}</p>
                              {file.is_variant && (
                                <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0.5">Variante</Badge>
                              )}
                            </div>
                            {file.artist && (
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">{file.artist}</p>
                            )}
                          </div>
                        </div>
                        {/* Action buttons - always visible below */}
                        <div className="flex items-center gap-2 flex-wrap pl-7 sm:pl-9">
                          <Button
                            size="sm"
                            onClick={() => handleBroadcastFile(file)}
                            className="h-9 gap-1.5 text-xs sm:text-sm bg-primary hover:bg-primary/90"
                          >
                            <Play className="w-3.5 h-3.5" />
                            Avvia
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePreview(file)}
                            className="h-9 gap-1.5 text-xs sm:text-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Mostra
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => exportChoFiles([file])}
                            className="h-9 gap-1.5 text-xs sm:text-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            .cho
                          </Button>
                          {canFull && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(file)}
                                className="h-9 gap-1.5 text-xs sm:text-sm"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                Modifica
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-9 gap-1.5 text-xs sm:text-sm text-destructive border-destructive/30 hover:bg-destructive/10"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Elimina
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Eliminare "{file.title}"?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Questa azione non può essere annullata.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => deleteFile(file.id)}
                                      className="bg-destructive text-destructive-foreground"
                                    >
                                      Elimina
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Setlists Tab */}
        <TabsContent value="setlists" className="space-y-4">
          <SongbookSetlistsTab canManage={canManage} canFull={canFull} />
        </TabsContent>

        {/* Compare Tab */}
        <TabsContent value="compare" className="space-y-4">
          <CatalogSongbookCompare />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingFile} onOpenChange={(open) => !open && setEditingFile(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Edit2 className="w-5 h-5 sm:w-6 sm:h-6" />
              Modifica: {editingFile?.title}
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Modifica il contenuto ChordPro del file
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm sm:text-base">Contenuto ChordPro</Label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="font-mono text-xs sm:text-sm h-[350px] sm:h-[400px] resize-none mt-2"
                placeholder="{title: Nome Canzone}&#10;{artist: Artista}&#10;&#10;[Am]Testo con [C]accordi..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFile(null)} className="h-10 sm:h-11">
              Annulla
            </Button>
            <Button onClick={handleSaveEdit} className="h-10 sm:h-11">
              <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <DialogTitle className="text-lg sm:text-xl">{previewFile?.title}</DialogTitle>
                {previewFile?.artist && (
                  <DialogDescription className="text-sm sm:text-base">{previewFile.artist}</DialogDescription>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={showChordsInPreview ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowChordsInPreview(!showChordsInPreview)}
                  className="h-10 sm:h-11 text-sm sm:text-base"
                >
                  <Guitar className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />
                  {showChordsInPreview ? "Nascondi Accordi" : "Mostra Accordi"}
                </Button>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="h-[400px] sm:h-[500px] mt-4">
            {previewFile && (
              <pre className="font-mono text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
                {showChordsInPreview 
                  ? renderWithChords(parseChordPro(previewFile.content))
                  : renderLyricsOnly(parseChordPro(previewFile.content))
                }
              </pre>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Advanced Search Dialog */}
      <SongbookAdvancedSearch
        open={showAdvanced}
        onOpenChange={setShowAdvanced}
        files={files}
        onDeleteFile={deleteFile}
        onUpdateFile={updateFile}
      />
    </div>
  );
}
