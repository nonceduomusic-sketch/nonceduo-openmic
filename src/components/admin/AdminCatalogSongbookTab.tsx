import React, { useState, useMemo, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHybridBroadcast } from "@/hooks/useHybridBroadcast";
import {
  Link2,
  Link2Off,
  Search,
  Music,
  Guitar,
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  Play,
  Square,
  Tv,
  Radio,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ── Normalizzazione per matching ──
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accenti
    .replace(/[''`]/g, "'")          // apostrofi
    .replace(/_/g, " ")              // underscore → spazio
    .replace(/[^a-z0-9' ]/g, "")    // rimuovi simboli
    .replace(/\s+/g, " ")
    .trim();
}

function matchScore(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  // Penalizza titoli troppo corti (< 3 char) — troppi falsi positivi
  if (na.length < 3 || nb.length < 3) {
    return na === nb ? 1 : 0;
  }
  // Penalizza differenze di lunghezza eccessive
  const lenRatio = Math.min(na.length, nb.length) / Math.max(na.length, nb.length);
  if (lenRatio < 0.4) return 0;
  // Uno contiene l'altro (solo se il contenuto è significativo)
  if (na.includes(nb) || nb.includes(na)) return 0.85 * lenRatio;
  // Dice coefficient
  const bigrams = (s: string) => {
    const set: string[] = [];
    for (let i = 0; i < s.length - 1; i++) set.push(s.slice(i, i + 2));
    return set;
  };
  const aBi = bigrams(na);
  const bBi = bigrams(nb);
  if (aBi.length === 0 || bBi.length === 0) return 0;
  const intersection = aBi.filter((b) => bBi.includes(b)).length;
  const dice = (2 * intersection) / (aBi.length + bBi.length);
  return dice * lenRatio;
}

type Song = { id: string; titolo: string; artista: string };
type SongbookFile = { id: string; title: string; artist: string | null; filename: string };
type LinkRow = { id: string; song_id: string; songbook_file_id: string; is_primary: boolean; match_confidence: number | null; linked_by: string };

type FilterMode = "all" | "linked" | "unlinked";

export function AdminCatalogSongbookTab() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { session, broadcastDual, stopBroadcast } = useHybridBroadcast('main');
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);
  const [autoMatchRunning, setAutoMatchRunning] = useState(false);

  // Broadcast state
  const isDualBroadcasting = !!(session as any)?.dual_broadcast && (session as any)?.is_broadcasting;
  const currentBroadcastSongId = isDualBroadcasting ? (session as any)?.current_song_id : null;

  // ── Fetch songs ──
  const { data: songs = [], isLoading: songsLoading } = useQuery({
    queryKey: ["catalog-songs-for-link"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("songs")
        .select("id, titolo, artista")
        .order("titolo");
      if (error) throw error;
      return data as Song[];
    },
  });

  // ── Fetch songbook files ──
  const { data: songbookFiles = [], isLoading: filesLoading } = useQuery({
    queryKey: ["songbook-files-for-link"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("songbook_files")
        .select("id, title, artist, filename")
        .order("title");
      if (error) throw error;
      return data as SongbookFile[];
    },
  });

  // ── Fetch existing links ──
  const { data: links = [], isLoading: linksLoading } = useQuery({
    queryKey: ["catalog-songbook-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_songbook_links")
        .select("id, song_id, songbook_file_id, is_primary, match_confidence, linked_by");
      if (error) throw error;
      return data as LinkRow[];
    },
  });

  // ── Realtime subscription ──
  useEffect(() => {
    const channel = supabase
      .channel("catalog-songbook-links-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "catalog_songbook_links" }, () => {
        queryClient.invalidateQueries({ queryKey: ["catalog-songbook-links"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "songs" }, () => {
        queryClient.invalidateQueries({ queryKey: ["catalog-songs-for-link"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "songbook_files" }, () => {
        queryClient.invalidateQueries({ queryKey: ["songbook-files-for-link"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // ── Maps for fast lookup ──
  const linksBySongId = useMemo(() => {
    const map = new Map<string, LinkRow[]>();
    links.forEach((l) => {
      const arr = map.get(l.song_id) || [];
      arr.push(l);
      map.set(l.song_id, arr);
    });
    return map;
  }, [links]);

  const songbookMap = useMemo(() => new Map(songbookFiles.map((f) => [f.id, f])), [songbookFiles]);

  // ── Filtered songs ──
  const filteredSongs = useMemo(() => {
    let list = songs;
    if (search) {
      const ns = normalize(search);
      list = list.filter(
        (s) => normalize(s.titolo).includes(ns) || normalize(s.artista).includes(ns)
      );
    }
    if (filterMode === "linked") {
      list = list.filter((s) => linksBySongId.has(s.id));
    } else if (filterMode === "unlinked") {
      list = list.filter((s) => !linksBySongId.has(s.id));
    }
    return list;
  }, [songs, search, filterMode, linksBySongId]);

  // ── Smart suggestions for a song ──
  const getSuggestions = useCallback(
    (song: Song): { file: SongbookFile; score: number }[] => {
      const linkedFileIds = new Set((linksBySongId.get(song.id) || []).map((l) => l.songbook_file_id));
      return songbookFiles
        .filter((f) => !linkedFileIds.has(f.id))
        .map((f) => {
          const titleScore = matchScore(song.titolo, f.title);
          const artistScore = f.artist ? matchScore(song.artista, f.artist) : 0;
          const combined = titleScore * 0.7 + artistScore * 0.3;
          return { file: f, score: combined };
        })
        .filter((s) => s.score >= 0.5)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    },
    [songbookFiles, linksBySongId]
  );

  // ── Create link mutation ──
  const createLink = useMutation({
    mutationFn: async ({ songId, fileId, confidence, linkedBy }: { songId: string; fileId: string; confidence?: number; linkedBy?: string }) => {
      const { error } = await supabase.from("catalog_songbook_links").insert({
        song_id: songId,
        songbook_file_id: fileId,
        is_primary: true,
        match_confidence: confidence ?? null,
        linked_by: linkedBy || "manual",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog-songbook-links"] });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  // ── Remove link mutation ──
  const removeLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from("catalog_songbook_links").delete().eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog-songbook-links"] });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  // ── Auto-match all ──
  const handleAutoMatch = async () => {
    setAutoMatchRunning(true);
    let created = 0;
    for (const song of songs) {
      if (linksBySongId.has(song.id)) continue;
      const suggestions = getSuggestions(song);
      if (suggestions.length > 0 && suggestions[0].score >= 0.85) {
        try {
          await supabase.from("catalog_songbook_links").insert({
            song_id: song.id,
            songbook_file_id: suggestions[0].file.id,
            is_primary: true,
            match_confidence: suggestions[0].score,
            linked_by: "auto",
          });
          created++;
        } catch { /* skip duplicates */ }
      }
    }
    queryClient.invalidateQueries({ queryKey: ["catalog-songbook-links"] });
    setAutoMatchRunning(false);
    toast({
      title: "Auto-match completato",
      description: `${created} nuovi collegamenti creati (soglia ≥ 85%).`,
    });
  };

  const isLoading = songsLoading || filesLoading || linksLoading;

  // ── Stats ──
  const linkedCount = songs.filter((s) => linksBySongId.has(s.id)).length;
  const unlinkedCount = songs.length - linkedCount;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Dual broadcast active banner */}
      {isDualBroadcasting && (
        <Card className="p-3 border-primary/40 bg-primary/5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
              <Radio className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Trasmissione Duale attiva</span>
            </div>
            <Button variant="destructive" size="sm" className="h-7 gap-1" onClick={async () => {
              await stopBroadcast();
              toast({ title: "Trasmissione fermata" });
            }}>
              <Square className="w-3 h-3" />
              Ferma
            </Button>
          </div>
        </Card>
      )}

      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Link2 className="w-5 h-5 text-primary" />
          Catalogo ↔ SongBook
        </h2>
        <p className="text-sm text-muted-foreground">
          Collega i brani del Catalogo ai file ChordPro di SongBook per abilitare la trasmissione duale.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold">{songs.length}</div>
          <div className="text-xs text-muted-foreground">Catalogo</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-green-500">{linkedCount}</div>
          <div className="text-xs text-muted-foreground">Collegati</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-orange-500">{unlinkedCount}</div>
          <div className="text-xs text-muted-foreground">Da collegare</div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cerca titolo o artista..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="linked">Collegati</SelectItem>
              <SelectItem value="unlinked">Da collegare</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleAutoMatch}
            disabled={autoMatchRunning}
            className="gap-1.5"
          >
            {autoMatchRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Auto-Match</span>
          </Button>
        </div>
      </div>

      {/* Song list */}
      <div className="space-y-2">
        {filteredSongs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Nessun brano trovato</p>
          </div>
        ) : (
          filteredSongs.map((song) => {
            const songLinks = linksBySongId.get(song.id) || [];
            const isLinked = songLinks.length > 0;
            const isExpanded = expandedSongId === song.id;

            return (
              <Card
                key={song.id}
                className={cn(
                  "overflow-hidden transition-all",
                  isLinked && "border-green-500/30 bg-green-500/5"
                )}
              >
                {/* Song header */}
                <button
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedSongId(isExpanded ? null : song.id)}
                >
                  <div className="shrink-0">
                    {isLinked ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-orange-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{song.titolo}</div>
                    <div className="text-xs text-muted-foreground truncate">{song.artista}</div>
                  </div>
                  {isLinked && (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {songLinks.length} file
                    </Badge>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>

                {/* Expanded: linked files + suggestions */}
                {isExpanded && (
                  <div className="border-t px-3 pb-3 pt-2 space-y-3">
                    {/* Existing links */}
                    {songLinks.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">File collegati</p>
                        {songLinks.map((link) => {
                          const file = songbookMap.get(link.songbook_file_id);
                          if (!file) return null;
                          return (
                            <div key={link.id} className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
                              <Guitar className="w-4 h-4 text-green-600 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium truncate">{file.title}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {file.artist || "—"} · {file.filename}
                                </div>
                              </div>
                              {currentBroadcastSongId === song.id ? (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-7 gap-1 shrink-0"
                                  onClick={async () => {
                                    await stopBroadcast();
                                    toast({ title: "Trasmissione fermata" });
                                  }}
                                >
                                  <Square className="w-3 h-3" />
                                  <span className="hidden sm:inline">Ferma</span>
                                </Button>
                              ) : (
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-7 gap-1 shrink-0"
                                  onClick={async () => {
                                    await broadcastDual(song.id, file.id);
                                    toast({ title: "Trasmissione Duale avviata", description: `TV: ${song.titolo} · Partiture: ${file.title}` });
                                  }}
                                >
                                  <Play className="w-3 h-3" />
                                  <span className="hidden sm:inline">Trasmetti</span>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 text-destructive hover:bg-destructive/10"
                                onClick={() => removeLink.mutate(link.id)}
                              >
                                <Link2Off className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <Separator />

                    {/* Suggestions */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Suggerimenti SongBook
                      </p>
                      <SuggestionsList
                        song={song}
                        suggestions={getSuggestions(song)}
                        onLink={(fileId, score) =>
                          createLink.mutate({ songId: song.id, fileId, confidence: score, linkedBy: "manual" })
                        }
                        isLinking={createLink.isPending}
                      />
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Suggestions sub-component ──
function SuggestionsList({
  song,
  suggestions,
  onLink,
  isLinking,
}: {
  song: Song;
  suggestions: { file: SongbookFile; score: number }[];
  onLink: (fileId: string, score: number) => void;
  isLinking: boolean;
}) {
  if (suggestions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic py-2">
        Nessun file SongBook compatibile trovato. Puoi importare un file .cho nel SongBook.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {suggestions.map(({ file, score }) => (
        <div
          key={file.id}
          className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
        >
          <Guitar className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-sm truncate">{file.title}</div>
            <div className="text-xs text-muted-foreground truncate">
              {file.artist || "—"} · {file.filename}
            </div>
          </div>
          <Badge
            variant={score >= 0.85 ? "default" : "secondary"}
            className="text-[10px] shrink-0"
          >
            {Math.round(score * 100)}%
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 shrink-0"
            onClick={() => onLink(file.id, score)}
            disabled={isLinking}
          >
            <Link2 className="w-3 h-3" />
            <span className="hidden sm:inline">Collega</span>
          </Button>
        </div>
      ))}
    </div>
  );
}
