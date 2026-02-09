import React, { useMemo, useState } from 'react';
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
import { Trash2, Copy, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { SongbookFile } from '@/hooks/useSongbook';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: SongbookFile[];
  onDeleteFile: (id: string) => Promise<boolean>;
}

/** Normalize title for duplicate comparison: lowercase, trim, remove trailing _ */
function normalizeForCompare(title: string): string {
  return title.trim().toLowerCase().replace(/_+$/, '');
}

interface DuplicateGroup {
  normalizedTitle: string;
  files: SongbookFile[];
  hasUnderscore: boolean;
  hasCorrected: boolean; // has at least one _ title OR is_variant file
}

export function SongbookAdvancedSearch({ open, onOpenChange, files, onDeleteFile }: Props) {
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /** A file is "corrected" if its title ends with _ OR is_variant is true */
  const isCorrectedFile = (f: SongbookFile) => f.title.trim().endsWith('_') || f.is_variant;

  // Find duplicate groups (same normalized title, possibly different _ suffix)
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
        groups.push({
          normalizedTitle: key.split('|||')[0],
          files: groupFiles.sort((a, b) => a.title.localeCompare(b.title)),
          hasUnderscore: groupFiles.some(f => f.title.trim().endsWith('_')),
          hasCorrected: groupFiles.some(f => isCorrectedFile(f)),
        });
      }
    }
    return groups.sort((a, b) => a.normalizedTitle.localeCompare(b.normalizedTitle));
  }, [files]);

  // Files marked as corrected (title _ or is_variant)
  const correctedFiles = useMemo(() => 
    files.filter(f => isCorrectedFile(f)).sort((a, b) => a.title.localeCompare(b.title)),
  [files]);

  // Groups where a corrected version exists AND non-corrected versions exist
  const cleanupCandidates = useMemo(() => 
    duplicateGroups.filter(g => g.hasCorrected),
  [duplicateGroups]);

  const toggleSelection = (id: string) => {
    setSelectedForDeletion(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllNonCorrected = () => {
    const ids = new Set<string>();
    for (const group of cleanupCandidates) {
      for (const f of group.files) {
        if (!isCorrectedFile(f)) {
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
              Trova duplicati, versioni corrette (con _) e pulisci il catalogo
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
                {cleanupCandidates.length > 0 && (
                  <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 border-accent text-accent">{cleanupCandidates.length}</Badge>
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
                      {duplicateGroups.length} gruppi di duplicati ({duplicateGroups.reduce((s, g) => s + g.files.length, 0)} file totali)
                    </p>
                    <Button variant="outline" size="sm" onClick={handleCopyDuplicates}>
                      <Copy className="w-3.5 h-3.5 mr-1.5" /> Copia lista
                    </Button>
                  </div>
                  <ScrollArea className="h-[350px] sm:h-[400px]">
                    <div className="space-y-3 pr-3">
                      {duplicateGroups.map((group, gi) => (
                        <div key={gi} className="border rounded-lg p-3 space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Gruppo: {group.normalizedTitle}
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
                                {f.is_variant && !f.title.trim().endsWith('_') && (
                                  <Badge variant="secondary" className="ml-1 text-[10px] px-1">Variante</Badge>
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

            {/* CLEANUP TAB */}
            <TabsContent value="cleanup" className="flex-1 min-h-0 mt-3">
              {cleanupCandidates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500" />
                  <p className="font-medium">Niente da pulire!</p>
                  <p className="text-sm mt-1">Non ci sono titoli con versione _ e versioni non corrette</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <p className="text-sm text-muted-foreground">
                      Dove esiste una versione corretta (_ o Variante), puoi eliminare le altre.
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
                          Elimina {selectedForDeletion.size} selezionati
                        </Button>
                      )}
                    </div>
                  </div>
                  <ScrollArea className="h-[350px] sm:h-[380px]">
                    <div className="space-y-3 pr-3">
                      {cleanupCandidates.map((group, gi) => (
                        <div key={gi} className="border rounded-lg p-3 space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {group.normalizedTitle}
                          </p>
                          {group.files.map(f => {
                            const corrected = isCorrectedFile(f);
                            return (
                              <div
                                key={f.id}
                                className={`flex items-center gap-2 py-2 px-2 rounded text-sm ${
                                  corrected ? 'bg-primary/10 border border-primary/20' : 'bg-muted/40'
                                }`}
                              >
                                {!corrected && (
                                  <Checkbox
                                    checked={selectedForDeletion.has(f.id)}
                                    onCheckedChange={() => toggleSelection(f.id)}
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <span className="font-medium">{f.title}</span>
                                  {f.artist && <span className="text-muted-foreground ml-1.5">– {f.artist}</span>}
                                </div>
                                {corrected ? (
                                  <div className="flex gap-1 shrink-0">
                                    <Badge variant="default" className="text-[10px]">✓ corretta</Badge>
                                    {f.is_variant && <Badge variant="secondary" className="text-[10px]">Variante</Badge>}
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] shrink-0 text-muted-foreground">da rimuovere?</Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Confirm bulk delete */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Eliminare {selectedForDeletion.size} file?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Verranno eliminate le versioni non corrette (senza _) per i gruppi selezionati.
              L'operazione non può essere annullata.
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
