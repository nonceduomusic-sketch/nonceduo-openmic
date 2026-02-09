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
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useSongbookFiles, useSongbookSetlists, SongbookFile } from '@/hooks/useSongbook';
import { parseChordPro, renderWithChords, renderLyricsOnly } from '@/lib/chordpro';
import { toast } from 'sonner';

interface SongbookTabProps {
  canManage?: boolean;
  canFull?: boolean;
}

export function SongbookTab({ canManage = true, canFull = true }: SongbookTabProps) {
  const { files, loading, uploadFiles, updateFile, deleteFile, deleteAllFiles } = useSongbookFiles();
  const { setlists, createSetlist } = useSongbookSetlists();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [editingFile, setEditingFile] = useState<SongbookFile | null>(null);
  const [editContent, setEditContent] = useState('');
  const [previewFile, setPreviewFile] = useState<SongbookFile | null>(null);
  const [showChordsInPreview, setShowChordsInPreview] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered and sorted files
  const filteredFiles = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return files
      .filter(f => 
        f.title.toLowerCase().includes(query) || 
        (f.artist || '').toLowerCase().includes(query)
      )
      .sort((a, b) => {
        // Variants (with _) go to bottom
        if (a.is_variant !== b.is_variant) {
          return a.is_variant ? 1 : -1;
        }
        return a.title.localeCompare(b.title);
      });
  }, [files, searchQuery]);

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!canFull) {
      toast.error('Non hai i permessi per caricare file');
      return;
    }
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      await uploadFiles(droppedFiles);
    }
  }, [canFull, uploadFiles]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canFull) return;
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      await uploadFiles(selectedFiles);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [canFull, uploadFiles]);

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
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Guitar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">SongBook</CardTitle>
                <CardDescription>Gestisci file ChordPro (.cho)</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{files.length} file</Badge>
              <Button onClick={openSongbookLive} variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                Apri SongBookLive
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="catalog" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="catalog" className="gap-2">
            <FileText className="w-4 h-4" />
            Catalogo
          </TabsTrigger>
          <TabsTrigger value="setlists" className="gap-2">
            <FolderOpen className="w-4 h-4" />
            Scalette SongBook
          </TabsTrigger>
        </TabsList>

        {/* Catalog Tab */}
        <TabsContent value="catalog" className="space-y-4">
          {/* Upload Zone */}
          <Card
            className={cn(
              "border-2 border-dashed transition-colors cursor-pointer",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => canFull && fileInputRef.current?.click()}
          >
            <CardContent className="py-8">
              <div className="flex flex-col items-center justify-center text-center">
                <Upload className={cn(
                  "w-10 h-10 mb-3 transition-colors",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )} />
                <p className="text-sm font-medium">
                  {isDragging ? "Rilascia i file qui" : "Trascina file .cho oppure clicca per selezionare"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supporta upload multiplo
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".cho"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* Search and Actions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca per titolo o artista..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {canFull && files.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Elimina tutti
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-destructive" />
                          Eliminare tutti i file?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Questa azione eliminerà permanentemente tutti i {files.length} file ChordPro.
                          L'operazione non può essere annullata.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={deleteAllFiles}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Elimina tutti
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Caricamento...
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {files.length === 0 
                    ? "Nessun file caricato. Trascina dei file .cho per iniziare."
                    : "Nessun file corrisponde alla ricerca"}
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredFiles.map((file) => (
                      <div
                        key={file.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors",
                          file.is_variant ? "bg-muted/20" : "bg-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <FileText className="w-5 h-5 text-primary shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium truncate">{file.title}</p>
                              {file.is_variant && (
                                <Badge variant="secondary" className="text-[10px]">Variante</Badge>
                              )}
                            </div>
                            {file.artist && (
                              <p className="text-sm text-muted-foreground truncate">{file.artist}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handlePreview(file)}
                            className="h-9 w-9"
                            title="Anteprima"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canFull && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEdit(file)}
                                className="h-9 w-9"
                                title="Modifica"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-9 w-9 text-destructive hover:text-destructive"
                                    title="Elimina"
                                  >
                                    <Trash2 className="w-4 h-4" />
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

        {/* Setlists Tab - Placeholder for Phase 2 */}
        <TabsContent value="setlists" className="space-y-4">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Scalette SongBook</p>
                <p className="text-sm mt-1">
                  Crea scalette personalizzate con i tuoi file ChordPro.
                  <br />
                  Funzionalità in arrivo nella Fase 2.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingFile} onOpenChange={(open) => !open && setEditingFile(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              Modifica: {editingFile?.title}
            </DialogTitle>
            <DialogDescription>
              Modifica il contenuto ChordPro del file
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Contenuto ChordPro</Label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="font-mono text-sm h-[400px] resize-none"
                placeholder="{title: Nome Canzone}&#10;{artist: Artista}&#10;&#10;[Am]Testo con [C]accordi..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFile(null)}>
              Annulla
            </Button>
            <Button onClick={handleSaveEdit}>
              <Save className="w-4 h-4 mr-2" />
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{previewFile?.title}</DialogTitle>
                {previewFile?.artist && (
                  <DialogDescription>{previewFile.artist}</DialogDescription>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={showChordsInPreview ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowChordsInPreview(!showChordsInPreview)}
                >
                  <Guitar className="w-4 h-4 mr-1" />
                  {showChordsInPreview ? "Nascondi Accordi" : "Mostra Accordi"}
                </Button>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="h-[500px] mt-4">
            {previewFile && (
              <pre className="font-mono text-sm whitespace-pre-wrap leading-relaxed">
                {showChordsInPreview 
                  ? renderWithChords(parseChordPro(previewFile.content))
                  : renderLyricsOnly(parseChordPro(previewFile.content))
                }
              </pre>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
