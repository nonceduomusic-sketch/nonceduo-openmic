import React, { useState, useMemo } from 'react';
import {
  ArrowRightLeft,
  Check,
  X,
  Download,
  Filter,
  Plus,
  Music,
  Guitar,
  AlertTriangle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useSongs, Song } from '@/hooks/useSongs';
import { useSongbookFiles, SongbookFile } from '@/hooks/useSongbook';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type FilterMode = 'all' | 'only-catalog' | 'only-songbook' | 'both' | 'variants';

interface ComparedItem {
  key: string; // normalized title+artist
  title: string;
  artist: string;
  inCatalog: boolean;
  inSongbook: boolean;
  catalogSong?: Song;
  songbookFile?: SongbookFile;
  isVariant: boolean;
  hasMultipleSongbookVersions: boolean;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/['''`´"""\-_\s]+/g, ' ') // collapse apostrophes, quotes, hyphens, underscores, whitespace into single space
    .replace(/\(.*?\)/g, '') // remove parenthetical text
    .trim();
}

function buildKey(title: string, artist: string): string {
  return `${normalize(title)}|||${normalize(artist)}`;
}

export const CatalogSongbookCompare: React.FC = () => {
  const { songs, loading: songsLoading, createSong } = useSongs();
  const { files, loading: filesLoading } = useSongbookFiles();

  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [addingToCatalog, setAddingToCatalog] = useState<Set<string>>(new Set());

  const loading = songsLoading || filesLoading;

  // Build comparison data
  const comparedItems = useMemo(() => {
    const map = new Map<string, ComparedItem>();

    // Add catalog songs
    for (const song of songs) {
      const key = buildKey(song.titolo, song.artista);
      map.set(key, {
        key,
        title: song.titolo,
        artist: song.artista,
        inCatalog: true,
        inSongbook: false,
        catalogSong: song,
        isVariant: false,
        hasMultipleSongbookVersions: false,
      });
    }

    // Match songbook files
    // Group songbook files by normalized key
    const songbookByKey = new Map<string, SongbookFile[]>();
    for (const file of files) {
      const key = buildKey(file.title, file.artist || '');
      if (!songbookByKey.has(key)) songbookByKey.set(key, []);
      songbookByKey.get(key)!.push(file);
    }

    for (const [key, sbFiles] of songbookByKey) {
      const existing = map.get(key);
      const primaryFile = sbFiles.find(f => !f.is_variant) || sbFiles[0];

      if (existing) {
        existing.inSongbook = true;
        existing.songbookFile = primaryFile;
        existing.hasMultipleSongbookVersions = sbFiles.length > 1;
        existing.isVariant = sbFiles.some(f => f.is_variant);
      } else {
        map.set(key, {
          key,
          title: primaryFile.title.replace(/_+$/, ''),
          artist: primaryFile.artist || '',
          inCatalog: false,
          inSongbook: true,
          songbookFile: primaryFile,
          isVariant: primaryFile.is_variant,
          hasMultipleSongbookVersions: sbFiles.length > 1,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.title.localeCompare(b.title, 'it')
    );
  }, [songs, files]);

  // Apply filters
  const filteredItems = useMemo(() => {
    let result = comparedItems;

    if (onlyDifferences) {
      result = result.filter(i => !(i.inCatalog && i.inSongbook));
    }

    switch (filterMode) {
      case 'only-catalog':
        result = result.filter(i => i.inCatalog && !i.inSongbook);
        break;
      case 'only-songbook':
        result = result.filter(i => !i.inCatalog && i.inSongbook);
        break;
      case 'both':
        result = result.filter(i => i.inCatalog && i.inSongbook);
        break;
      case 'variants':
        result = result.filter(i => i.isVariant || i.hasMultipleSongbookVersions);
        break;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        i => i.title.toLowerCase().includes(q) || i.artist.toLowerCase().includes(q)
      );
    }

    return result;
  }, [comparedItems, filterMode, onlyDifferences, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const onlyCatalog = comparedItems.filter(i => i.inCatalog && !i.inSongbook).length;
    const onlySongbook = comparedItems.filter(i => !i.inCatalog && i.inSongbook).length;
    const inBoth = comparedItems.filter(i => i.inCatalog && i.inSongbook).length;
    const variants = comparedItems.filter(i => i.isVariant || i.hasMultipleSongbookVersions).length;
    return { onlyCatalog, onlySongbook, inBoth, variants, total: comparedItems.length };
  }, [comparedItems]);

  // Add to catalog
  const handleAddToCatalog = async (item: ComparedItem) => {
    if (!item.songbookFile) return;
    setAddingToCatalog(prev => new Set(prev).add(item.key));
    try {
      const success = await createSong({
        titolo: item.title.replace(/_+$/, ''),
        artista: item.artist,
      });
      if (success) {
        toast.success(`"${item.title}" aggiunto al Catalogo`);
      }
    } finally {
      setAddingToCatalog(prev => {
        const next = new Set(prev);
        next.delete(item.key);
        return next;
      });
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const items = filteredItems.length > 0 ? filteredItems : comparedItems;
    if (items.length === 0) {
      toast.error('Nessun dato da esportare');
      return;
    }

    const escapeCSV = (field: string): string => '"' + field.replace(/"/g, '""') + '"';
    const BOM = '\uFEFF';
    const headers = ['Titolo', 'Artista', 'In Catalogo', 'In SongBook', 'Variante', 'Stato'];
    const rows = items.map(i => {
      const status = i.inCatalog && i.inSongbook
        ? 'OK'
        : i.inCatalog
        ? 'Solo Catalogo'
        : 'Solo SongBook';
      return [
        escapeCSV(i.title),
        escapeCSV(i.artist),
        i.inCatalog ? 'Sì' : 'No',
        i.inSongbook ? 'Sì' : 'No',
        i.isVariant ? 'Sì' : 'No',
        status,
      ].join(';');
    });

    const csvContent = BOM + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `confronto-catalogo-songbook-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Report esportato (${items.length} brani)`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Confronto Catalogo ↔ SongBook</CardTitle>
                <CardDescription className="text-xs">
                  {stats.total} brani unici · {stats.inBoth} presenti in entrambi
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Esporta CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Stat badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge
              variant={filterMode === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilterMode('all')}
            >
              Tutti ({stats.total})
            </Badge>
            <Badge
              variant={filterMode === 'only-catalog' ? 'default' : 'outline'}
              className={cn('cursor-pointer', stats.onlyCatalog > 0 && filterMode !== 'only-catalog' && 'border-amber-500/50 text-amber-600')}
              onClick={() => setFilterMode(filterMode === 'only-catalog' ? 'all' : 'only-catalog')}
            >
              <Music className="w-3 h-3 mr-1" />
              Solo Catalogo ({stats.onlyCatalog})
            </Badge>
            <Badge
              variant={filterMode === 'only-songbook' ? 'default' : 'outline'}
              className={cn('cursor-pointer', stats.onlySongbook > 0 && filterMode !== 'only-songbook' && 'border-amber-500/50 text-amber-600')}
              onClick={() => setFilterMode(filterMode === 'only-songbook' ? 'all' : 'only-songbook')}
            >
              <Guitar className="w-3 h-3 mr-1" />
              Solo SongBook ({stats.onlySongbook})
            </Badge>
            <Badge
              variant={filterMode === 'both' ? 'default' : 'outline'}
              className={cn('cursor-pointer', filterMode !== 'both' && 'border-green-500/50 text-green-600')}
              onClick={() => setFilterMode(filterMode === 'both' ? 'all' : 'both')}
            >
              <Check className="w-3 h-3 mr-1" />
              In entrambi ({stats.inBoth})
            </Badge>
            {stats.variants > 0 && (
              <Badge
                variant={filterMode === 'variants' ? 'default' : 'outline'}
                className={cn('cursor-pointer', filterMode !== 'variants' && 'border-blue-500/50 text-blue-600')}
                onClick={() => setFilterMode(filterMode === 'variants' ? 'all' : 'variants')}
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                Varianti ({stats.variants})
              </Badge>
            )}
          </div>

          {/* Search + toggle */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per titolo o artista..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Switch
                id="only-diff"
                checked={onlyDifferences}
                onCheckedChange={setOnlyDifferences}
              />
              <Label htmlFor="only-diff" className="text-sm whitespace-nowrap cursor-pointer">
                Solo differenze
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results - Card list for mobile, table hidden */}
      <Card>
        <CardContent className="p-2 sm:p-0">
          <div className="max-h-[60vh] overflow-auto">
            {/* Mobile card list */}
            <div className="sm:hidden space-y-2">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <ArrowRightLeft className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground text-sm">
                    {searchQuery || filterMode !== 'all' || onlyDifferences
                      ? 'Nessun risultato con i filtri selezionati'
                      : 'Nessun brano trovato'}
                  </p>
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isMissing = !item.inCatalog || !item.inSongbook;
                  return (
                    <div
                      key={item.key}
                      className={cn(
                        "p-3 rounded-lg border",
                        isMissing ? 'bg-amber-500/5 border-amber-500/20' : 'border-border'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.artist || '—'}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.isVariant && <Badge variant="secondary" className="text-[9px] px-1 font-mono">_</Badge>}
                          {item.hasMultipleSongbookVersions && <Badge variant="outline" className="text-[9px] px-1">multi</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1">
                            <Music className="w-3 h-3" />
                            {item.inCatalog ? <Check className="w-3.5 h-3.5 text-green-500" /> : <X className="w-3.5 h-3.5 text-red-400" />}
                          </span>
                          <span className="flex items-center gap-1">
                            <Guitar className="w-3 h-3" />
                            {item.inSongbook ? <Check className="w-3.5 h-3.5 text-green-500" /> : <X className="w-3.5 h-3.5 text-red-400" />}
                          </span>
                        </div>
                        <div>
                          {!item.inCatalog && item.inSongbook && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              disabled={addingToCatalog.has(item.key)}
                              onClick={() => handleAddToCatalog(item)}
                            >
                              {addingToCatalog.has(item.key) ? (
                                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <Plus className="w-3 h-3 mr-1" />
                              )}
                              Catalogo
                            </Button>
                          )}
                          {item.inCatalog && !item.inSongbook && (
                            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                              Manca SB
                            </Badge>
                          )}
                          {item.inCatalog && item.inSongbook && (
                            <Badge variant="outline" className="text-[10px] text-green-600 border-green-500/30">
                              OK
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop table */}
            <Table className="hidden sm:table">
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-[35%]">Titolo</TableHead>
                  <TableHead className="w-[25%]">Artista</TableHead>
                  <TableHead className="w-[12%] text-center">Catalogo</TableHead>
                  <TableHead className="w-[12%] text-center">SongBook</TableHead>
                  <TableHead className="w-[16%] text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <ArrowRightLeft className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-muted-foreground">
                        {searchQuery || filterMode !== 'all' || onlyDifferences
                          ? 'Nessun risultato con i filtri selezionati'
                          : 'Nessun brano trovato'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => {
                    const isMissing = !item.inCatalog || !item.inSongbook;
                    return (
                      <TableRow
                        key={item.key}
                        className={cn(isMissing && 'bg-amber-500/5')}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="truncate max-w-[220px]">{item.title}</span>
                            {item.isVariant && <Badge variant="secondary" className="text-[9px] px-1 font-mono">_</Badge>}
                            {item.hasMultipleSongbookVersions && <Badge variant="outline" className="text-[9px] px-1">multi</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <span className="truncate max-w-[160px] block">{item.artist || '—'}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.inCatalog ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-red-400 mx-auto" />}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.inSongbook ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-red-400 mx-auto" />}
                        </TableCell>
                        <TableCell className="text-right">
                          {!item.inCatalog && item.inSongbook && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              disabled={addingToCatalog.has(item.key)}
                              onClick={() => handleAddToCatalog(item)}
                            >
                              {addingToCatalog.has(item.key) ? (
                                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <Plus className="w-3 h-3 mr-1" />
                              )}
                              Aggiungi a Catalogo
                            </Button>
                          )}
                          {item.inCatalog && !item.inSongbook && (
                            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                              Manca in SongBook
                            </Badge>
                          )}
                          {item.inCatalog && item.inSongbook && (
                            <Badge variant="outline" className="text-[10px] text-green-600 border-green-500/30">
                              OK
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary footer */}
      {filteredItems.length > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          Visualizzati {filteredItems.length} di {stats.total} brani ·
          {stats.onlyCatalog > 0 && (
            <span className="text-amber-600"> {stats.onlyCatalog} solo in Catalogo</span>
          )}
          {stats.onlyCatalog > 0 && stats.onlySongbook > 0 && ' · '}
          {stats.onlySongbook > 0 && (
            <span className="text-amber-600"> {stats.onlySongbook} solo in SongBook</span>
          )}
        </div>
      )}
    </div>
  );
};
