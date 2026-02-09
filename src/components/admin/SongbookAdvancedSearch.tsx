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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Trash2, Copy, CheckCircle, AlertTriangle, Sparkles, Star, Hash, FileText } from 'lucide-react';
import { SongbookFile } from '@/hooks/useSongbook';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: SongbookFile[];
  onDeleteFile: (id: string) => Promise<boolean>;
  onUpdateFile?: (id: string, updates: Partial<SongbookFile>) => Promise<boolean>;
}

/** Normalize a string for comparison: trim, lowercase, collapse whitespace */
function norm(s: string): string {
  return (s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/\s+/g, ' ');
}

/** Simple string hash for grouping (not crypto, just fast fingerprint) */
function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  // Use a second pass for better distribution
  let h2 = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h2 ^= s.charCodeAt(i);
    h2 = Math.imul(h2, 0x01000193);
  }
  return `${(h >>> 0).toString(36)}_${(h2 >>> 0).toString(36)}`;
}

/** Exact duplicate: title + artist + content all identical (normalized) */
interface ExactDuplicateGroup {
  hash: string;
  normalizedTitle: string;
  artist: string;
  files: SongbookFile[];
}

/** Title+artist group (may have different content = versions, not duplicates) */
interface TitleArtistGroup {
  key: string;
  normalizedTitle: string;
  artist: string;
  files: SongbookFile[];
  hasCorrected: boolean;
}

const isCorrectedFile = (f: SongbookFile) => f.title.trim().endsWith('_') || f.is_variant;

export function SongbookAdvancedSearch({ open, onOpenChange, files, onDeleteFile, onUpdateFile }: Props) {
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [autoSelectDuplicates, setAutoSelectDuplicates] = useState(false);
  // Override map: groupKey -> fileId chosen as "corrected"
  const [correctedOverrides, setCorrectedOverrides] = useState<Map<string, string>>(new Map());

  // ---- EXACT DUPLICATES (title + artist + content) ----
  const exactDuplicateGroups = useMemo(() => {
    const map = new Map<string, { files: SongbookFile[]; nt: string; na: string }>();
    for (const f of files) {
      const nt = norm(f.title);
      const na = norm(f.artist || '');
      const nc = norm(f.content);
      const hash = simpleHash(nt + '|||' + na + '|||' + nc);
      const entry = map.get(hash);
      if (entry) {
        entry.files.push(f);
      } else {
        map.set(hash, { files: [f], nt, na });
      }
    }

    const groups: ExactDuplicateGroup[] = [];
    for (const [hash, { files: gFiles, nt, na }] of map.entries()) {
      if (gFiles.length > 1) {
        groups.push({
          hash,
          normalizedTitle: nt,
          artist: na,
          files: gFiles.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
        });
      }
    }
    return groups.sort((a, b) => a.normalizedTitle.localeCompare(b.normalizedTitle));
  }, [files]);

  const totalExactDuplicates = useMemo(
    () => exactDuplicateGroups.reduce((s, g) => s + g.files.length - 1, 0),
    [exactDuplicateGroups]
  );

  // Auto-select: when toggled, mark all except the first (oldest) in each group
  const handleAutoSelectToggle = useCallback((checked: boolean) => {
    setAutoSelectDuplicates(checked);
    if (checked) {
      const ids = new Set<string>();
      for (const group of exactDuplicateGroups) {
        // Keep the first (oldest), select the rest
        for (let i = 1; i < group.files.length; i++) {
          ids.add(group.files[i].id);
        }
      }
      setSelectedForDeletion(ids);
    } else {
      setSelectedForDeletion(new Set());
    }
  }, [exactDuplicateGroups]);

  // ---- TITLE+ARTIST groups (for "versions" / corrected tab) ----
  const titleArtistGroups = useMemo(() => {
    const map = new Map<string, SongbookFile[]>();
    for (const f of files) {
      const key = norm(f.title).replace(/_+$/, '') + '|||' + norm(f.artist || '');
      const arr = map.get(key) || [];
      arr.push(f);
      map.set(key, arr);
    }

    const groups: TitleArtistGroup[] = [];
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

  /** Get the "corrected" file id for a title+artist group */
  const getCorrectedId = useCallback((group: TitleArtistGroup): string | null => {
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

  const setCorrectedForGroup = useCallback(async (group: TitleArtistGroup, fileId: string) => {
    setCorrectedOverrides(prev => {
      const next = new Map(prev);
      next.set(group.key, fileId);
      return next;
    });
    setSelectedForDeletion(prev => {
      if (!prev.has(fileId)) return prev;
      const next = new Set(prev);
      next.delete(fileId);
      return next;
    });
    if (onUpdateFile) {
      await onUpdateFile(fileId, { is_variant: true });
    }
  }, [onUpdateFile]);

  const selectAllNonCorrected = () => {
    const ids = new Set<string>();
    for (const group of titleArtistGroups) {
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
    setAutoSelectDuplicates(false);
    toast.success(`${count} file eliminati`);
  };

  const handleCopyDuplicates = (groups: { files: SongbookFile[] }[]) => {
    const text = groups
      .map(g => g.files.map(f => `${f.title} – ${f.artist || 'N/A'}`).join('\n'))
      .join('\n---\n');
    navigator.clipboard.writeText(text);
    toast.success('Lista copiata');
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
              Trova duplicati identici, versioni e pulisci il catalogo
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="exact" className="flex-1 min-h-0 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 h-auto p-1 gap-1">
              <TabsTrigger value="exact" className="py-2.5 text-xs sm:text-sm">
                <Hash className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
                Duplicati
                {exactDuplicateGroups.length > 0 && (
                  <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5">{totalExactDuplicates}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="versions" className="py-2.5 text-xs sm:text-sm">
                <FileText className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
                Versioni
                {titleArtistGroups.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{titleArtistGroups.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="corrected" className="py-2.5 text-xs sm:text-sm">
                <Star className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
                Corretti
                <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5">{correctedFiles.length}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* ===== EXACT DUPLICATES TAB ===== */}
            <TabsContent value="exact" className="flex-1 min-h-0 mt-3">
              {exactDuplicateGroups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-10 h-10 mx-auto mb-3 text-primary" />
                  <p className="font-medium">Nessun duplicato identico!</p>
                  <p className="text-sm mt-1">Tutti i brani hanno contenuto diverso</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-3">
                    {/* Summary */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-sm text-muted-foreground">
                        <strong>{totalExactDuplicates}</strong> duplicati in{' '}
                        <strong>{exactDuplicateGroups.length}</strong> gruppi
                        {' '}— verrà mantenuta <strong>1 versione</strong> per gruppo
                      </p>
                      <Button variant="outline" size="sm" onClick={() => handleCopyDuplicates(exactDuplicateGroups)}>
                        <Copy className="w-3.5 h-3.5 mr-1.5" /> Copia lista
                      </Button>
                    </div>

                    {/* Auto-select toggle */}
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                      <Switch
                        id="auto-select"
                        checked={autoSelectDuplicates}
                        onCheckedChange={handleAutoSelectToggle}
                      />
                      <Label htmlFor="auto-select" className="text-sm cursor-pointer flex-1">
                        Seleziona automaticamente duplicati identici
                      </Label>
                      {autoSelectDuplicates && selectedForDeletion.size > 0 && (
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

                  <ScrollArea className="h-[300px] sm:h-[350px]">
                    <div className="space-y-3 pr-3">
                      {exactDuplicateGroups.map((group) => (
                        <div key={group.hash} className="border rounded-lg p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {group.normalizedTitle}
                              {group.artist && <span className="normal-case ml-1">– {group.artist}</span>}
                            </p>
                            <Badge variant="destructive" className="text-[10px]">
                              {group.files.length} copie identiche
                            </Badge>
                          </div>
                          {group.files.map((f, idx) => {
                            const isKept = idx === 0;
                            const isSelected = selectedForDeletion.has(f.id);
                            return (
                              <div
                                key={f.id}
                                className={`flex items-center gap-2 py-2 px-2 rounded text-sm ${
                                  isKept ? 'bg-primary/10 border border-primary/20' : 'bg-muted/40'
                                }`}
                              >
                                {!isKept ? (
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleSelection(f.id)}
                                    className="shrink-0"
                                  />
                                ) : (
                                  <div className="w-4 shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <span className="font-medium">{f.title}</span>
                                  {f.artist && <span className="text-muted-foreground ml-1.5">– {f.artist}</span>}
                                </div>
                                <div className="flex gap-1 shrink-0 items-center">
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(f.created_at).toLocaleDateString('it-IT')}
                                  </span>
                                  {isKept && (
                                    <Badge variant="default" className="text-[10px]">✓ conservato</Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Bottom action bar if selections exist but auto-toggle is off */}
                  {!autoSelectDuplicates && selectedForDeletion.size > 0 && (
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirmDeleteOpen(true)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Elimina {selectedForDeletion.size} selezionati
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* ===== VERSIONS TAB (title+artist, different content) ===== */}
            <TabsContent value="versions" className="flex-1 min-h-0 mt-3">
              {titleArtistGroups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-10 h-10 mx-auto mb-3 text-primary" />
                  <p className="font-medium">Nessuna versione multipla</p>
                  <p className="text-sm mt-1">Ogni brano ha un'unica versione</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <p className="text-sm text-muted-foreground">
                      {titleArtistGroups.length} brani con versioni multiple (contenuto diverso).
                      <br />
                      <span className="text-xs">Clicca ⭐ per scegliere la versione corretta, poi elimina le altre.</span>
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
                      {titleArtistGroups.map((group) => {
                        const correctedId = getCorrectedId(group);
                        return (
                          <div key={group.key} className="border rounded-lg p-3 space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {group.normalizedTitle}
                              {group.artist && <span className="normal-case ml-1">– {group.artist}</span>}
                              <Badge variant="secondary" className="ml-2 text-[10px]">
                                {group.files.length} versioni
                              </Badge>
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
                                  <Button
                                    variant={isChosen ? 'default' : 'ghost'}
                                    size="icon"
                                    className="h-7 w-7 shrink-0"
                                    title={isChosen ? 'Versione scelta' : 'Imposta come corretta'}
                                    onClick={() => setCorrectedForGroup(group, f.id)}
                                  >
                                    <Star className={`w-3.5 h-3.5 ${isChosen ? 'fill-current' : ''}`} />
                                  </Button>

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
                                    <Badge variant="outline" className="text-[10px]">
                                      {f.content.length} car.
                                    </Badge>
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

            {/* ===== CORRECTED TAB ===== */}
            <TabsContent value="corrected" className="flex-1 min-h-0 mt-3">
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
              {autoSelectDuplicates
                ? `Verranno eliminati ${selectedForDeletion.size} duplicati identici. Per ogni gruppo verrà conservata 1 copia (la più vecchia).`
                : `Le versioni scelte (⭐) verranno conservate. L'operazione non può essere annullata.`
              }
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
