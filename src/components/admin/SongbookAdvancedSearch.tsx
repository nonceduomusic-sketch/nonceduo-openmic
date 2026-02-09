import React, { useMemo, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Copy, CheckCircle, AlertTriangle, Sparkles, Star } from 'lucide-react';
import { SongbookFile } from '@/hooks/useSongbook';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: SongbookFile[];
  onDeleteFile: (id: string) => Promise<boolean>;
  onUpdateFile?: (id: string, updates: Partial<SongbookFile>) => Promise<boolean>;
}

function normalizeForCompare(title: string): string {
  return title.trim().toLowerCase().replace(/_+$/, '');
}

interface DuplicateGroup {
  key: string;
  normalizedTitle: string;
  artist: string;
  files: SongbookFile[];
  hasCorrected: boolean;
}

export function SongbookAdvancedSearch({ open, onOpenChange, files, onDeleteFile, onUpdateFile }: Props) {
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Override map: groupKey -> fileId chosen as "corrected"
  const [correctedOverrides, setCorrectedOverrides] = useState<Map<string, string>>(new Map());

  const isCorrectedFile = (f: SongbookFile) => f.title.trim().endsWith('_') || f.is_variant;

  const duplicateGroups = useMemo(() => {
    const map = new Map<string, SongbookFile[]>();
    for (const f of files) {
      const key = normalizeForCompare(f.title) + '|||' + (f.artist || '').trim().toLowerCase();
      const arr = map.get(key) || [];
      arr.push(f);
      map.set(key, arr);
    }

    const groups: DuplicateGroup[] = [];
    for (const [key, groupFiles] of map.entries()) {
      if (groupFiles.length > 1) {
        const [title, artist] = key.split('|||');
        groups.push({
          key,
          normalizedTitle: title,
          artist,
          files: groupFiles.sort((a, b) => a.title.localeCompare(b.title)),
          hasCorrected: groupFiles.some(f => isCorrectedFile(f)),
        });
      }
    }
    return groups.sort((a, b) => a.normalizedTitle.localeCompare(b.normalizedTitle));
  }, [files]);

  const correctedFiles = useMemo(() =>
    files.filter(f => isCorrectedFile(f)).sort((a, b) => a.title.localeCompare(b.title)),
  [files]);

  /** Get the "corrected" file id for a group - either override or auto-detected */
  const getCorrectedId = useCallback((group: DuplicateGroup): string | null => {
    const override = correctedOverrides.get(group.key);
    if (override) return override;
    const auto = group.files.find(f => isCorrectedFile(f));
    return auto?.id || null;
  }, [correctedOverrides]);

  const toggleSelection = (id: string) => {
    setSelectedForDeletion(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setCorrectedForGroup = useCallback(async (group: DuplicateGroup, fileId: string) => {
    setCorrectedOverrides(prev => {
      const next = new Map(prev);
      next.set(group.key, fileId);
      return next;
    });
    // Remove this file from deletion selection if it was there
    setSelectedForDeletion(prev => {
      if (!prev.has(fileId)) return prev;
      const next = new Set(prev);
      next.delete(fileId);
      return next;
    });
    // Persist is_variant on the chosen file
    if (onUpdateFile) {
      await onUpdateFile(fileId, { is_variant: true });
    }
  }, [onUpdateFile]);

  const selectAllNonCorrected = () => {
    const ids = new Set<string>();
    for (const group of duplicateGroups) {
      if (group.files.length < 2) continue;
      const correctedId = getCorrectedId(group);
      if (!correctedId) continue;
      for (const f of group.files) {
        if (f.id !== correctedId) {
          ids.add(f.id);
        }
      }
    }
    setSelectedForDeletion(ids);
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    let count = 0;
    for (const id of selectedForDeletion) {
      const ok = await onDeleteFile(id);
      if (ok) count++;
    }
    setDeleting(false);
    setConfirmDeleteOpen(false);
    setSelectedForDeletion(new Set());
    toast.success(`${count} file eliminati`);
  };

  const handleCopyDuplicates = () => {
    const text = duplicateGroups
      .map(g => g.files.map(f => `${f.title} – ${f.artist || 'N/A'}`).join('\n'))
      .join('\n---\n');
    navigator.clipboard.writeText(text);
    toast.success('Lista duplicati copiata');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-primary" />
              Ricerca Avanzata SongBook
            </DialogTitle>
            <DialogDescription>
              Trova duplicati, versioni corrette e pulisci il catalogo
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="duplicates" className="flex-1 min-h-0 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 h-auto p-1 gap-1">
              <TabsTrigger value="duplicates" className="py-2.5 text-xs sm:text-sm">
                Duplicati
                {duplicateGroups.length > 0 && (
                  <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5">{duplicateGroups.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="underscore" className="py-2.5 text-xs sm:text-sm">
                Corretti
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{correctedFiles.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="cleanup" className="py-2.5 text-xs sm:text-sm">
                Pulizia
                {duplicateGroups.length > 0 && (
                  <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 border-accent text-accent">{duplicateGroups.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* DUPLICATES TAB */}
            <TabsContent value="duplicates" className="flex-1 min-h-0 mt-3">
              {duplicateGroups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500" />
                  <p className="font-medium">Nessun duplicato trovato!</p>
                  <p className="text-sm mt-1">Il catalogo è pulito</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">
                      {duplicateGroups.length} gruppi ({duplicateGroups.reduce((s, g) => s + g.files.length, 0)} file)
                    </p>
                    <Button variant="outline" size="sm" onClick={handleCopyDuplicates}>
                      <Copy className="w-3.5 h-3.5 mr-1.5" /> Copia lista
                    </Button>
                  </div>
                  <ScrollArea className="h-[350px] sm:h-[400px]">
                    <div className="space-y-3 pr-3">
                      {duplicateGroups.map((group) => (
                        <div key={group.key} className="border rounded-lg p-3 space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {group.normalizedTitle}
                            {group.hasCorrected && (
                              <Badge variant="default" className="ml-2 text-[10px]">Ha versione corretta</Badge>
                            )}
                          </p>
                          {group.files.map(f => (
                            <div key={f.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/40 text-sm">
                              <div className="min-w-0 flex-1">
                                <span className="font-medium">{f.title}</span>
                                {f.artist && <span className="text-muted-foreground ml-1.5">– {f.artist}</span>}
                                {isCorrectedFile(f) && (
                                  <Badge variant="default" className="ml-1.5 text-[10px] px-1">✓ corretta</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </TabsContent>

            {/* UNDERSCORE TAB */}
            <TabsContent value="underscore" className="flex-1 min-h-0 mt-3">
              {correctedFiles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Nessun file corretto (con _ o variante)</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-1.5 pr-3">
                    {correctedFiles.map(f => (
                      <div key={f.id} className="flex items-center justify-between py-2 px-3 rounded bg-muted/40 text-sm">
                        <div className="min-w-0 flex-1">
                          <span className="font-medium">{f.title}</span>
                          {f.artist && <span className="text-muted-foreground ml-1.5">– {f.artist}</span>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {f.title.trim().endsWith('_') && <Badge variant="default" className="text-[10px]">_</Badge>}
                          {f.is_variant && <Badge variant="secondary" className="text-[10px]">Variante</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            {/* CLEANUP TAB - enhanced with choice */}
            <TabsContent value="cleanup" className="flex-1 min-h-0 mt-3">
              {duplicateGroups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500" />
                  <p className="font-medium">Niente da pulire!</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <p className="text-sm text-muted-foreground">
                      Clicca ⭐ per scegliere la versione da tenere, poi seleziona le altre da eliminare.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={selectAllNonCorrected}>
                        Seleziona non corrette
                      </Button>
                      {selectedForDeletion.size > 0 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setConfirmDeleteOpen(true)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          Elimina {selectedForDeletion.size}
                        </Button>
                      )}
                    </div>
                  </div>
                  <ScrollArea className="h-[350px] sm:h-[380px]">
                    <div className="space-y-3 pr-3">
                      {duplicateGroups.map((group) => {
                        const correctedId = getCorrectedId(group);
                        return (
                          <div key={group.key} className="border rounded-lg p-3 space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {group.normalizedTitle}
                              {group.artist && <span className="normal-case ml-1">– {group.artist}</span>}
                            </p>
                            {group.files.map(f => {
                              const isChosen = f.id === correctedId;
                              return (
                                <div
                                  key={f.id}
                                  className={`flex items-center gap-2 py-2 px-2 rounded text-sm ${
                                    isChosen ? 'bg-primary/10 border border-primary/20' : 'bg-muted/40'
                                  }`}
                                >
                                  {/* Star button to set as corrected */}
                                  <Button
                                    variant={isChosen ? 'default' : 'ghost'}
                                    size="icon"
                                    className="h-7 w-7 shrink-0"
                                    title={isChosen ? 'Versione scelta' : 'Imposta come corretta'}
                                    onClick={() => setCorrectedForGroup(group, f.id)}
                                  >
                                    <Star className={`w-3.5 h-3.5 ${isChosen ? 'fill-current' : ''}`} />
                                  </Button>

                                  {/* Checkbox for deletion (only non-chosen) */}
                                  {!isChosen ? (
                                    <Checkbox
                                      checked={selectedForDeletion.has(f.id)}
                                      onCheckedChange={() => toggleSelection(f.id)}
                                    />
                                  ) : (
                                    <div className="w-4" /> 
                                  )}

                                  <div className="min-w-0 flex-1">
                                    <span className="font-medium">{f.title}</span>
                                    {f.artist && <span className="text-muted-foreground ml-1.5">– {f.artist}</span>}
                                  </div>
                                  
                                  <div className="flex gap-1 shrink-0">
                                    {isChosen && (
                                      <Badge variant="default" className="text-[10px]">✓ corretta</Badge>
                                    )}
                                    {isCorrectedFile(f) && !isChosen && (
                                      <Badge variant="secondary" className="text-[10px]">auto _</Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Eliminare {selectedForDeletion.size} file?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Le versioni scelte (⭐) verranno conservate. L'operazione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground"
            >
              {deleting ? 'Eliminazione...' : `Elimina ${selectedForDeletion.size} file`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
