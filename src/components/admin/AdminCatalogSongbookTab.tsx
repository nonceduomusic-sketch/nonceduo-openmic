import React, { useState, useMemo, useCallback, useEffect } from "react";
import { CatalogSongbookCompare } from "./CatalogSongbookCompare";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHybridBroadcast } from "@/hooks/useHybridBroadcast";
import { useReservations } from "@/hooks/useReservations";
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
  Filter,
  ChevronDown,
  ChevronUp,
  Play,
  Square,
  Radio,
  Eye,
  EyeOff,
  ListMusic,
  Mic2,
  MoreHorizontal,
  ExternalLink,
  Tv,
  BookOpen,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { safeGetItem, safeSetItem } from "@/lib/safeStorage";
import { BroadcastLinksCards } from "./LocalLinksCard";

// ── Italian number-word map ──
const IT_NUM_TO_WORD: Record<string, string> = {
  '0': 'zero', '1': 'uno', '2': 'due', '3': 'tre', '4': 'quattro',
  '5': 'cinque', '6': 'sei', '7': 'sette', '8': 'otto', '9': 'nove',
  '10': 'dieci', '11': 'undici', '12': 'dodici', '13': 'tredici',
  '14': 'quattordici', '15': 'quindici', '16': 'sedici', '17': 'diciassette',
  '18': 'diciotto', '19': 'diciannove', '20': 'venti', '30': 'trenta',
  '40': 'quaranta', '50': 'cinquanta', '60': 'sessanta', '70': 'settanta',
  '80': 'ottanta', '90': 'novanta', '100': 'cento', '1000': 'mille',
  '50000': 'cinquantamila',
};
const IT_WORD_TO_NUM = Object.fromEntries(Object.entries(IT_NUM_TO_WORD).map(([k, v]) => [v, k]));

/** Replace all number tokens with their word equivalent and vice-versa, return both variants */
function expandNumbers(s: string): string[] {
  // Replace digits → words
  let withWords = s.replace(/\d+/g, (m) => IT_NUM_TO_WORD[m] || m);
  // Replace words → digits
  let withDigits = s;
  for (const [word, num] of Object.entries(IT_WORD_TO_NUM)) {
    withDigits = withDigits.replace(new RegExp(`\\b${word}\\b`, 'gi'), num);
  }
  return [s, withWords, withDigits];
}

// ── Normalizzazione per matching ──
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`]/g, "'")
    .replace(/_/g, " ")
    .replace(/[^a-z0-9' ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalize and also produce a "spaceless" version for fuzzy comparison */
function normalizeStrict(s: string): string {
  return normalize(s).replace(/\s/g, "");
}

function matchScore(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;

  // Spaceless exact match (handles "50Mila" vs "50 Mila")
  if (normalizeStrict(a) === normalizeStrict(b)) return 0.98;

  // Number expansion match (handles "10" vs "Dieci", "50000" vs "50Mila")
  const aVariants = expandNumbers(na);
  const bVariants = expandNumbers(nb);
  for (const av of aVariants) {
    for (const bv of bVariants) {
      const nav = normalize(av);
      const nbv = normalize(bv);
      if (nav === nbv) return 0.96;
      if (nav.replace(/\s/g, "") === nbv.replace(/\s/g, "")) return 0.94;
    }
  }

  if (na.length < 3 || nb.length < 3) {
    return na === nb ? 1 : 0;
  }
  const lenRatio = Math.min(na.length, nb.length) / Math.max(na.length, nb.length);
  if (lenRatio < 0.4) return 0;
  if (na.includes(nb) || nb.includes(na)) return 0.85 * lenRatio;
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

// ── Shared ChordPro Preview ──
function ChordProPreview({ fileId }: { fileId: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("songbook_files")
          .select("content")
          .eq("id", fileId)
          .single();
        if (!cancelled) {
          setContent(error ? "Errore nel caricamento" : data?.content || "");
        }
      } catch {
        if (!cancelled) setContent("Errore nel caricamento");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fileId]);

  const previewLines = useMemo(() => {
    if (!content) return [];
    return content
      .split("\n")
      .filter((line) => {
        const trimmed = line.trim();
        if (/^\{(title|t|subtitle|st|artist|key|tempo|capo|comment|ci|c):/.test(trimmed)) return false;
        if (trimmed === "" || trimmed === "{soc}" || trimmed === "{eoc}" || trimmed === "{sot}" || trimmed === "{eot}") return false;
        return true;
      })
      .slice(0, 15);
  }, [content]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="border-t px-3 py-2 bg-background/50">
      <ScrollArea className="max-h-[200px]">
        <pre className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {previewLines.map((line, i) => {
            const parts = line.split(/(\[[^\]]+\])/g);
            return (
              <div key={i}>
                {parts.map((part, j) =>
                  part.startsWith("[") && part.endsWith("]") ? (
                    <span key={j} className="text-primary font-semibold">{part}</span>
                  ) : (
                    <span key={j}>{part}</span>
                  )
                )}
              </div>
            );
          })}
          {content && content.split("\n").length > 15 && (
            <div className="text-[10px] text-muted-foreground/50 mt-1">
              ... altre {content.split("\n").length - 15} righe
            </div>
          )}
        </pre>
      </ScrollArea>
    </div>
  );
}

// ── File card with preview toggle + actions ──
function FileCard({
  file,
  score,
  variant = "suggestion",
  isBroadcasting,
  onPreviewToggle,
  showPreview,
  actions,
}: {
  file: SongbookFile;
  score?: number;
  variant?: "linked" | "suggestion" | "current";
  isBroadcasting?: boolean;
  onPreviewToggle: () => void;
  showPreview: boolean;
  actions: React.ReactNode;
}) {
  const bgClass = variant === "linked"
    ? "bg-green-500/10"
    : variant === "current"
    ? "bg-primary/10 border border-primary/30"
    : "bg-muted/40";

  return (
    <div className={cn("rounded-lg overflow-hidden", bgClass)}>
      <div className="flex items-center gap-2 p-2">
        <Guitar className={cn(
          "w-3.5 h-3.5 shrink-0",
          variant === "linked" ? "text-green-600" : "text-muted-foreground"
        )} />
        <div className="min-w-0 flex-1">
          <div className="text-xs sm:text-sm font-medium truncate">{file.title}</div>
          <div className="text-[10px] text-muted-foreground truncate">
            {file.artist || "—"} · {file.filename}
          </div>
        </div>
        {variant === "current" && (
          <Badge variant="default" className="text-[9px] shrink-0">Attuale</Badge>
        )}
        {score !== undefined && (
          <Badge
            variant={score >= 0.85 ? "default" : "secondary"}
            className="text-[9px] shrink-0"
          >
            {Math.round(score * 100)}%
          </Badge>
        )}
      </div>
      {/* Action buttons - always wrap on a new row for mobile friendliness */}
      <div className="flex items-center gap-1.5 px-2 pb-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={onPreviewToggle}
        >
          {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showPreview ? "Nascondi" : "Mostra"}
        </Button>
        {actions}
      </div>
      {showPreview && <ChordProPreview fileId={file.id} />}
    </div>
  );
}

export function AdminCatalogSongbookTab() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { session, broadcastDual, stopBroadcast } = useHybridBroadcast('main');
  const { activeReservations } = useReservations();
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);
  const [autoMatchRunning, setAutoMatchRunning] = useState(false);
  const [unlinkAllRunning, setUnlinkAllRunning] = useState(false);
  const [showLiveQueue, setShowLiveQueue] = useState(() => {
    const saved = safeGetItem('local', 'admin-catalog-live-queue-open');
    return saved !== null ? saved === 'true' : true;
  });
  const [visibleCount, setVisibleCount] = useState(50);

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

  // Reset visible count when search/filter changes
  useEffect(() => {
    setVisibleCount(50);
  }, [search, filterMode]);

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

  const songsByNormalized = useMemo(() => {
    const map = new Map<string, Song>();
    songs.forEach((s) => {
      map.set(`${normalize(s.titolo)}|||${normalize(s.artista)}`, s);
    });
    return map;
  }, [songs]);

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

  // ── Smart suggestions (excludes already linked) ──
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

  // ── All matching files (including already linked, for alternative selection) ──
  const getAllMatchingFiles = useCallback(
    (song: Song): { file: SongbookFile; score: number }[] => {
      return songbookFiles
        .map((f) => {
          const titleScore = matchScore(song.titolo, f.title);
          const artistScore = f.artist ? matchScore(song.artista, f.artist) : 0;
          const combined = titleScore * 0.7 + artistScore * 0.3;
          return { file: f, score: combined };
        })
        .filter((s) => s.score >= 0.5)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
    },
    [songbookFiles]
  );

  // ── Mutations ──
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catalog-songbook-links"] }),
    onError: (err: any) => toast({ title: "Errore", description: err.message, variant: "destructive" }),
  });

  const removeLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from("catalog_songbook_links").delete().eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catalog-songbook-links"] }),
    onError: (err: any) => toast({ title: "Errore", description: err.message, variant: "destructive" }),
  });

  // ── Auto-match all ──
  const handleAutoMatch = async () => {
    setAutoMatchRunning(true);
    let created = 0;
    for (const song of songs) {
      if (linksBySongId.has(song.id)) continue;
      const suggestions = getSuggestions(song);
      if (suggestions.length > 0 && suggestions[0].score >= 0.85) {
        // Prefer underscore variant (filename ending with _) among top matches with similar scores
        const topScore = suggestions[0].score;
        const topCandidates = suggestions.filter(s => s.score >= topScore - 0.05);
        const preferred = topCandidates.find(s => s.file.filename.replace(/\.cho$/i, '').endsWith('_')) || topCandidates[0];
        try {
          await supabase.from("catalog_songbook_links").insert({
            song_id: song.id,
            songbook_file_id: preferred.file.id,
            is_primary: true,
            match_confidence: preferred.score,
            linked_by: "auto",
          });
          created++;
        } catch { /* skip duplicates */ }
      }
    }
    queryClient.invalidateQueries({ queryKey: ["catalog-songbook-links"] });
    setAutoMatchRunning(false);
    toast({ title: "Auto-match completato", description: `${created} nuovi collegamenti creati (soglia ≥ 85%).` });
  };

  // ── Unlink all ──
  // (unlinkAllRunning state declared at top)
  const handleUnlinkAll = async () => {
    if (!confirm(`Sei sicuro di voler scollegare tutti i ${linkedCount} collegamenti? L'operazione è irreversibile.`)) return;
    setUnlinkAllRunning(true);
    try {
      const { error } = await supabase
        .from("catalog_songbook_links")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["catalog-songbook-links"] });
      toast({ title: "Tutti i collegamenti rimossi", description: `${linkedCount} collegamenti eliminati.` });
    } catch (err: any) {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    } finally {
      setUnlinkAllRunning(false);
    }
  };

  const isLoading = songsLoading || filesLoading || linksLoading;
  const linkedCount = songs.filter((s) => linksBySongId.has(s.id)).length;
  const unlinkedCount = songs.length - linkedCount;

  // ── Live queue items ──
  const liveQueueItems = useMemo(() => {
    return activeReservations.map((res) => {
      const key = `${normalize(res.song_title)}|||${normalize(res.song_artist)}`;
      const catalogSong = songsByNormalized.get(key);
      const songLinks = catalogSong ? linksBySongId.get(catalogSong.id) || [] : [];
      const primaryLink = songLinks.find((l) => l.is_primary) || songLinks[0];
      const linkedFile = primaryLink ? songbookMap.get(primaryLink.songbook_file_id) : undefined;
      const suggestions = catalogSong && !primaryLink ? getSuggestions(catalogSong) : [];
      const allSuggestions = catalogSong ? getAllMatchingFiles(catalogSong).filter(s => s.file.id !== linkedFile?.id) : [];
      return { reservation: res, catalogSong, primaryLink, linkedFile, suggestions, allSuggestions };
    });
  }, [activeReservations, songsByNormalized, linksBySongId, songbookMap, getSuggestions, getAllMatchingFiles]);

  // Paginated songs
  const visibleSongs = useMemo(() => filteredSongs.slice(0, visibleCount), [filteredSongs, visibleCount]);
  const hasMore = visibleCount < filteredSongs.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Sticky dual broadcast banner */}
      {isDualBroadcasting && (
        <div className="sticky top-0 z-20">
          <Card className="p-2 sm:p-3 border-primary/40 bg-primary/5 backdrop-blur-sm shadow-md">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse shrink-0" />
                <Radio className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs sm:text-sm font-medium truncate">Trasmissione Duale attiva</span>
              </div>
              <Button variant="destructive" size="sm" className="h-7 gap-1 shrink-0" onClick={async () => {
                await stopBroadcast();
                toast({ title: "Trasmissione fermata" });
              }}>
                <Square className="w-3 h-3" />
                <span className="hidden sm:inline">Ferma</span>
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <a href="/trasmetti" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                  <Tv className="w-3.5 h-3.5" />
                  <span>Trasmetti (TV)</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </Button>
              </a>
              <a href="/partiture" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Partiture</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </Button>
              </a>
            </div>
           </Card>
         </div>
       )}

      {/* Broadcast page links - always visible */}
      <BroadcastLinksCards filter={['tv', 'partiture', 'songbook']} />

      {/* ── Live Queue Section ── */}
      {activeReservations.length > 0 && (
        <Card className="overflow-hidden border-orange-500/30">
          <button
            className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
            onClick={() => {
              const next = !showLiveQueue;
              setShowLiveQueue(next);
              safeSetItem('local', 'admin-catalog-live-queue-open', String(next));
            }}
          >
            <div className="flex items-center gap-2">
              <ListMusic className="w-5 h-5 text-orange-500" />
              <span className="font-medium text-sm">Scaletta Live</span>
              <Badge variant="secondary" className="text-[10px]">
                {activeReservations.length}
              </Badge>
            </div>
            {showLiveQueue ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showLiveQueue && (
            <div className="border-t px-2 sm:px-3 pb-3 pt-2 space-y-1.5">
              {liveQueueItems.map(({ reservation, catalogSong, linkedFile, allSuggestions }) => (
                <LiveQueueItem
                  key={reservation.id}
                  reservation={reservation}
                  catalogSong={catalogSong}
                  linkedFile={linkedFile}
                  allSuggestions={allSuggestions}
                  isDualBroadcasting={isDualBroadcasting}
                  currentBroadcastSongId={currentBroadcastSongId}
                  onBroadcast={async (songId, fileId) => {
                    await broadcastDual(songId, fileId);
                    toast({ title: "Trasmissione Duale avviata" });
                  }}
                  onStop={async () => {
                    await stopBroadcast();
                    toast({ title: "Trasmissione fermata" });
                  }}
                  onLink={(songId, fileId, score) => {
                    createLink.mutate({ songId, fileId, confidence: score, linkedBy: "manual" });
                  }}
                  isLinking={createLink.isPending}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Link2 className="w-5 h-5 text-primary" />
          Catalogo ↔ SongBook
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Collega i brani del Catalogo ai file ChordPro per la trasmissione duale.
        </p>
      </div>

      {/* Stats - compact on mobile */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <Card className="p-2 sm:p-3 text-center">
          <div className="text-xl sm:text-2xl font-bold">{songs.length}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground">Catalogo</div>
        </Card>
        <Card className="p-2 sm:p-3 text-center">
          <div className="text-xl sm:text-2xl font-bold text-green-500">{linkedCount}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground">Collegati</div>
        </Card>
        <Card className="p-2 sm:p-3 text-center">
          <div className="text-xl sm:text-2xl font-bold text-orange-500">{unlinkedCount}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground">Da collegare</div>
        </Card>
      </div>

      {/* Toolbar - stacks on mobile */}
      <div className="flex flex-col gap-2">
        <div className="relative">
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
            <SelectTrigger className="flex-1 sm:w-[140px] sm:flex-none">
              <Filter className="w-4 h-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti ({songs.length})</SelectItem>
              <SelectItem value="linked">Collegati ({linkedCount})</SelectItem>
              <SelectItem value="unlinked">Da collegare ({unlinkedCount})</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleAutoMatch}
            disabled={autoMatchRunning}
            className="gap-1.5"
          >
            {autoMatchRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span className="hidden sm:inline">Auto-Match</span>
          </Button>
          {linkedCount > 0 && (
            <Button
              variant="outline"
              onClick={handleUnlinkAll}
              disabled={unlinkAllRunning || autoMatchRunning}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              {unlinkAllRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2Off className="w-4 h-4" />}
              <span className="hidden sm:inline">Scollega tutto</span>
            </Button>
          )}
        </div>
      </div>

      {/* Song list (paginated) */}
      <div className="space-y-2">
        {filteredSongs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Nessun brano trovato</p>
          </div>
        ) : (
          <>
            {visibleSongs.map((song) => (
              <CatalogSongCard
                key={song.id}
                song={song}
                songLinks={linksBySongId.get(song.id) || []}
                songbookMap={songbookMap}
                isExpanded={expandedSongId === song.id}
                onToggle={() => setExpandedSongId(expandedSongId === song.id ? null : song.id)}
                currentBroadcastSongId={currentBroadcastSongId}
                suggestions={getSuggestions(song)}
                onBroadcast={async (songId, fileId) => { await broadcastDual(songId, fileId); }}
                onStop={async () => { await stopBroadcast(); }}
                onLink={(fileId, score) => createLink.mutate({ songId: song.id, fileId, confidence: score, linkedBy: "manual" })}
                onUnlink={(linkId) => removeLink.mutate(linkId)}
                isLinking={createLink.isPending}
              />
            ))}
            {hasMore && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setVisibleCount((c) => c + 50)}
              >
                <MoreHorizontal className="w-4 h-4" />
                Mostra altri ({filteredSongs.length - visibleCount} rimanenti)
              </Button>
            )}
          </>
        )}
      </div>

      {/* Confronto Catalogo ↔ SongBook */}
      <Separator className="my-6" />
      <CatalogSongbookCompare />
    </div>
  );
}

// ── Catalog Song Card ──
function CatalogSongCard({
  song,
  songLinks,
  songbookMap,
  isExpanded,
  onToggle,
  currentBroadcastSongId,
  suggestions,
  onBroadcast,
  onStop,
  onLink,
  onUnlink,
  isLinking,
}: {
  song: Song;
  songLinks: LinkRow[];
  songbookMap: Map<string, SongbookFile>;
  isExpanded: boolean;
  onToggle: () => void;
  currentBroadcastSongId: string | null;
  suggestions: { file: SongbookFile; score: number }[];
  onBroadcast: (songId: string, fileId: string) => Promise<void>;
  onStop: () => Promise<void>;
  onLink: (fileId: string, score: number) => void;
  onUnlink: (linkId: string) => void;
  isLinking: boolean;
}) {
  const isLinked = songLinks.length > 0;
  const isBroadcasting = currentBroadcastSongId === song.id;
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);

  return (
    <Card className={cn("overflow-hidden transition-colors", isLinked && "border-green-500/30 bg-green-500/5")}>
      <button
        className="w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 text-left hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className="shrink-0">
          {isLinked ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" /> : <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-xs sm:text-sm truncate">{song.titolo}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{song.artista}</div>
        </div>
        {isLinked && (
          <Badge variant="secondary" className="shrink-0 text-[10px]">{songLinks.length} file</Badge>
        )}
        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {isExpanded && (
        <div className="border-t px-2 sm:px-3 pb-3 pt-2 space-y-3">
          {/* Linked files */}
          {songLinks.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">File collegati</p>
              {songLinks.map((link) => {
                const file = songbookMap.get(link.songbook_file_id);
                if (!file) return null;
                return (
                  <FileCard
                    key={link.id}
                    file={file}
                    variant="linked"
                    isBroadcasting={isBroadcasting}
                    showPreview={previewFileId === file.id}
                    onPreviewToggle={() => setPreviewFileId(previewFileId === file.id ? null : file.id)}
                    actions={
                      <>
                        {isBroadcasting ? (
                          <Button variant="destructive" size="sm" className="h-7 gap-1" onClick={async () => { await onStop(); }}>
                            <Square className="w-3 h-3" /> Ferma
                          </Button>
                        ) : (
                          <Button variant="default" size="sm" className="h-7 gap-1" onClick={async () => { await onBroadcast(song.id, file.id); }}>
                            <Play className="w-3 h-3" /> Trasmetti
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => onUnlink(link.id)}>
                          <Link2Off className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    }
                  />
                );
              })}
            </div>
          )}

          <Separator />

          {/* Alternative / Suggestions */}
          <div className="space-y-1.5">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {songLinks.length > 0 ? "Alternative SongBook" : "Suggerimenti SongBook"}
            </p>
            {suggestions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">
                Nessun file SongBook compatibile trovato.
              </p>
            ) : (
              suggestions.map(({ file, score }) => (
                <FileCard
                  key={file.id}
                  file={file}
                  score={score}
                  variant="suggestion"
                  showPreview={previewFileId === file.id}
                  onPreviewToggle={() => setPreviewFileId(previewFileId === file.id ? null : file.id)}
                  actions={
                    <>
                      <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => onLink(file.id, score)} disabled={isLinking}>
                        <Link2 className="w-3 h-3" /> Collega
                      </Button>
                      <Button variant="default" size="sm" className="h-7 gap-1 text-xs" onClick={async () => {
                        onLink(file.id, score);
                        setTimeout(() => onBroadcast(song.id, file.id), 500);
                      }} disabled={isLinking}>
                        <Play className="w-3 h-3" /> <span className="hidden sm:inline">Trasmetti</span>
                      </Button>
                    </>
                  }
                />
              ))
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Live Queue Item ──
function LiveQueueItem({
  reservation,
  catalogSong,
  linkedFile,
  allSuggestions,
  isDualBroadcasting,
  currentBroadcastSongId,
  onBroadcast,
  onStop,
  onLink,
  isLinking,
}: {
  reservation: { id: string; customer_name: string; song_title: string; song_artist: string };
  catalogSong?: Song;
  linkedFile?: SongbookFile;
  allSuggestions: { file: SongbookFile; score: number }[];
  isDualBroadcasting: boolean;
  currentBroadcastSongId: string | null;
  onBroadcast: (songId: string, fileId: string) => Promise<void>;
  onStop: () => Promise<void>;
  onLink: (songId: string, fileId: string, score: number) => void;
  isLinking: boolean;
}) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const isBroadcasting = catalogSong && currentBroadcastSongId === catalogSong.id;
  const hasAlternatives = allSuggestions.length > 0;

  return (
    <div className={cn(
      "p-2 sm:p-2.5 rounded-lg border",
      isBroadcasting ? "border-primary/40 bg-primary/5" : "border-border"
    )}>
      <div className="flex items-start sm:items-center gap-2 flex-wrap">
        <Mic2 className="w-4 h-4 text-orange-500 shrink-0 mt-0.5 sm:mt-0" />
        <div className="min-w-0 flex-1">
          <div className="text-xs sm:text-sm font-medium truncate">{reservation.song_title}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
            {reservation.song_artist} · <span className="text-foreground/70">{reservation.customer_name}</span>
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {linkedFile && catalogSong && (
            isBroadcasting ? (
              <Button variant="destructive" size="sm" className="h-7 gap-1" onClick={onStop}>
                <Square className="w-3 h-3" /> <span className="hidden sm:inline">Ferma</span>
              </Button>
            ) : (
              <Button variant="default" size="sm" className="h-7 gap-1" onClick={() => onBroadcast(catalogSong.id, linkedFile.id)}>
                <Play className="w-3 h-3" /> <span className="hidden sm:inline">Trasmetti</span>
              </Button>
            )
          )}
          {catalogSong && hasAlternatives && (
            <Button
              variant="outline"
              size="sm"
              className={cn("h-7 gap-1", showAlternatives && "border-primary text-primary")}
              onClick={() => setShowAlternatives(!showAlternatives)}
            >
              {showAlternatives ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {linkedFile ? "Cambia" : `${allSuggestions.length}`}
            </Button>
          )}
          {linkedFile && (
            <Badge variant="outline" className="text-[9px] text-green-600 border-green-500/30">
              <Guitar className="w-3 h-3 mr-0.5" />SB
            </Badge>
          )}
          {!linkedFile && !catalogSong && (
            <Badge variant="outline" className="text-[9px] text-muted-foreground">N/C</Badge>
          )}
          {!linkedFile && catalogSong && !hasAlternatives && (
            <Badge variant="outline" className="text-[9px] text-orange-500 border-orange-500/30">No SB</Badge>
          )}
        </div>
      </div>
      {/* Linked file info */}
      {linkedFile && !showAlternatives && (
        <div className="mt-1 ml-6 text-[10px] text-muted-foreground truncate">
          <Guitar className="w-3 h-3 inline mr-0.5" />
          {linkedFile.title} · {linkedFile.filename}
        </div>
      )}
      {/* Alternatives */}
      {showAlternatives && catalogSong && (
        <div className="mt-2 ml-4 sm:ml-6 space-y-1.5">
          {linkedFile && (
            <FileCard
              file={linkedFile}
              variant="current"
              showPreview={previewFileId === linkedFile.id}
              onPreviewToggle={() => setPreviewFileId(previewFileId === linkedFile.id ? null : linkedFile.id)}
              actions={
                !isBroadcasting ? (
                  <Button variant="default" size="sm" className="h-7 gap-1 text-xs" onClick={() => onBroadcast(catalogSong.id, linkedFile.id)}>
                    <Play className="w-3 h-3" /> Trasmetti
                  </Button>
                ) : null
              }
            />
          )}
          {allSuggestions.map(({ file, score }) => (
            <FileCard
              key={file.id}
              file={file}
              score={score}
              variant="suggestion"
              showPreview={previewFileId === file.id}
              onPreviewToggle={() => setPreviewFileId(previewFileId === file.id ? null : file.id)}
              actions={
                <>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => onLink(catalogSong.id, file.id, score)} disabled={isLinking}>
                    <Link2 className="w-3 h-3" /> Collega
                  </Button>
                  <Button variant="default" size="sm" className="h-7 gap-1 text-xs" onClick={() => {
                    onLink(catalogSong.id, file.id, score);
                    setTimeout(() => onBroadcast(catalogSong.id, file.id), 500);
                  }} disabled={isLinking}>
                    <Play className="w-3 h-3" />
                  </Button>
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
