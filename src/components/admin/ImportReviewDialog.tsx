import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Upload, Filter, CheckSquare, Square, AlertTriangle, Database, FileText } from 'lucide-react';

interface ParsedSong {
  titolo: string;
  artista: string;
  slug: string;
  hasText: boolean;
  existsInDb: boolean;
}

interface ImportReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allSongs: ParsedSong[];
  existingCount: number;
  newCount: number;
  onImport: (selectedSlugs: string[]) => void;
  isImporting: boolean;
}

type FilterMode = 'all' | 'new' | 'existing' | 'variant' | 'no_variant';

export const ImportReviewDialog: React.FC<ImportReviewDialogProps> = ({
  open, onOpenChange, allSongs, existingCount, newCount, onImport, isImporting,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let list = allSongs;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.titolo.toLowerCase().includes(q) || s.artista.toLowerCase().includes(q));
    }
    if (filter === 'new') list = list.filter(s => !s.existsInDb);
    if (filter === 'existing') list = list.filter(s => s.existsInDb);
    if (filter === 'variant') list = list.filter(s => s.titolo.trim().endsWith('_'));
    if (filter === 'no_variant') list = list.filter(s => !s.titolo.trim().endsWith('_'));
    return list;
  }, [allSongs, search, filter]);

  const selectedCount = allSongs.length - excluded.size;

  const toggleExclude = (slug: string) => {
    setExcluded(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setExcluded(prev => {
      const next = new Set(prev);
      filtered.forEach(s => next.delete(s.slug));
      return next;
    });
  };

  const deselectAllFiltered = () => {
    setExcluded(prev => {
      const next = new Set(prev);
      filtered.forEach(s => next.add(s.slug));
      return next;
    });
  };

  const excludeExisting = () => {
    setExcluded(prev => {
      const next = new Set(prev);
      allSongs.filter(s => s.existsInDb).forEach(s => next.add(s.slug));
      return next;
    });
  };

  const handleImport = () => {
    const selected = allSongs.filter(s => !excluded.has(s.slug)).map(s => s.slug);
    onImport(selected);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            Revisione Import
          </DialogTitle>
          <DialogDescription>
            {allSongs.length} brani unici · {newCount} nuovi · {existingCount} già presenti · {selectedCount} selezionati per l'import
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 flex-1 min-h-0 flex flex-col">
          {/* Search + quick actions */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cerca titolo o artista..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Filter tabs */}
          <Tabs value={filter} onValueChange={v => setFilter(v as FilterMode)}>
            <TabsList className="w-full grid grid-cols-5 h-auto">
              <TabsTrigger value="all" className="text-xs py-1.5">Tutti ({allSongs.length})</TabsTrigger>
              <TabsTrigger value="new" className="text-xs py-1.5">Nuovi ({newCount})</TabsTrigger>
              <TabsTrigger value="existing" className="text-xs py-1.5">Esistenti ({existingCount})</TabsTrigger>
              <TabsTrigger value="variant" className="text-xs py-1.5">Con _ ({allSongs.filter(s => s.titolo.trim().endsWith('_')).length})</TabsTrigger>
              <TabsTrigger value="no_variant" className="text-xs py-1.5">Senza _ ({allSongs.filter(s => !s.titolo.trim().endsWith('_')).length})</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={selectAllFiltered}>
              <CheckSquare className="w-3.5 h-3.5 mr-1" /> Seleziona filtrati
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAllFiltered}>
              <Square className="w-3.5 h-3.5 mr-1" /> Deseleziona filtrati
            </Button>
            {existingCount > 0 && (
              <Button variant="outline" size="sm" onClick={excludeExisting} className="text-accent border-accent/30">
                <Database className="w-3.5 h-3.5 mr-1" /> Escludi già presenti ({existingCount})
              </Button>
            )}
          </div>

          {/* Song list */}
          <ScrollArea className="flex-1 min-h-0 border rounded-lg" style={{ maxHeight: '45vh' }}>
            <div className="p-2 space-y-1">
              {filtered.map(song => {
                const isSelected = !excluded.has(song.slug);
                return (
                  <div
                    key={song.slug}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                      isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'bg-muted/30 opacity-60 hover:opacity-80'
                    }`}
                    onClick={() => toggleExclude(song.slug)}
                  >
                    <Checkbox checked={isSelected} className="pointer-events-none" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{song.titolo}</p>
                      <p className="text-xs text-muted-foreground truncate">{song.artista}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {song.existsInDb && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-accent/50 text-accent">
                          <Database className="w-3 h-3 mr-0.5" /> DB
                        </Badge>
                      )}
                      {song.titolo.trim().endsWith('_') && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/50 text-primary">
                          _
                        </Badge>
                      )}
                      {song.hasText && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          <FileText className="w-3 h-3" />
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">Nessun brano corrisponde ai filtri</p>
              )}
            </div>
          </ScrollArea>

          {/* Import button */}
          <Button
            onClick={handleImport}
            disabled={isImporting || selectedCount === 0}
            className="w-full neon-button-pink"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isImporting ? 'Importazione...' : `Importa ${selectedCount} brani selezionati`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
