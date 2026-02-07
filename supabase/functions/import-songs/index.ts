import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/* ------------------------------------------------------------------ */
/*  CORS                                                              */
/* ------------------------------------------------------------------ */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
interface SongData {
  titolo: string;
  artista: string;
  testo: string;
  slug: string;
}

/* ------------------------------------------------------------------ */
/*  Utils                                                             */
/* ------------------------------------------------------------------ */
function normalize(input: string): string {
  return (input ?? "")
    .toString()
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLyrics(input: string): string {
  return (input ?? "")
    .toString()
    .replace(/\u00A0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Slug NON distruttivo → riduce i falsi duplicati
 */
function generateSlug(titolo: string, artista: string): string {
  return `${normalize(titolo)}-${normalize(artista)}`
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

/* ------------------------------------------------------------------ */
/*  CSV Parsing (robusto)                                              */
/* ------------------------------------------------------------------ */
function parseCsv(csv: string): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    if (row.length === 0) return;
    const col1 = row[0] ?? "";
    const col2 = row.slice(1).join(",") ?? "";
    rows.push([col1, col2]);
    row = [];
  };

  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];

    if (inQuotes) {
      if (c === '"' && csv[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      continue;
    }

    if (c === ",") {
      pushField();
      continue;
    }

    if (c === "\n") {
      pushField();
      pushRow();
      continue;
    }

    if (c === "\r") continue;

    field += c;
  }

  if (field.length || row.length) {
    pushField();
    pushRow();
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/*  Titolo / Artista split (TOLLERANTE)                                */
/* ------------------------------------------------------------------ */
function splitTitoloArtista(raw: string): { titolo: string; artista: string } | null {
  const s = normalize(raw);
  const matches = [...s.matchAll(/[-–—|]/g)];
  if (matches.length === 0) return null;

  const m = matches[matches.length - 1];
  const idx = m.index!;
  const titolo = s.slice(0, idx).trim();
  const artista = s.slice(idx + 1).trim();

  if (!titolo || !artista) return null;
  return { titolo, artista };
}

/* ------------------------------------------------------------------ */
/*  Parse CSV → Songs                                                 */
/* ------------------------------------------------------------------ */
function parseSongs(csv: string): SongData[] {
  const rows = parseCsv(csv);
  if (rows.length <= 1) return [];

  const dataRows = rows.slice(1); // skip header
  const songs: SongData[] = [];

  for (const [rawTitleArtist, rawLyrics] of dataRows) {
    const split = splitTitoloArtista(rawTitleArtist);
    if (!split) continue;

    const titolo = normalize(split.titolo);
    const artista = normalize(split.artista);
    const testo = normalizeLyrics(rawLyrics);
    const slug = generateSlug(titolo, artista);

    songs.push({ titolo, artista, testo, slug });
  }

  return songs;
}

/* ------------------------------------------------------------------ */
/*  Server                                                            */
/* ------------------------------------------------------------------ */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { csvContent, action } = await req.json();
    if (!csvContent) {
      return new Response(JSON.stringify({ error: "csvContent missing" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const parsed = parseSongs(csvContent);

    /* ---------------- PREVIEW ---------------- */
    if (action === "parse") {
      const map = new Map<string, SongData>();
      for (const s of parsed) {
        const prev = map.get(s.slug);
        if (!prev || s.testo.length > prev.testo.length) {
          map.set(s.slug, s);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          totalRows: parsed.length,
          uniqueSongs: map.size,
          preview: [...map.values()].slice(0, 5),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    /* ---------------- IMPORT ---------------- */
    if (action === "import") {
      const map = new Map<string, SongData>();
      for (const s of parsed) {
        const prev = map.get(s.slug);
        if (!prev || s.testo.length > prev.testo.length) {
          map.set(s.slug, s);
        }
      }

      const uniqueSongs = [...map.values()];
      const chunkSize = 50;
      let imported = 0;

      for (let i = 0; i < uniqueSongs.length; i += chunkSize) {
        const chunk = uniqueSongs.slice(i, i + chunkSize);
        const { error } = await supabase.from("songs").upsert(chunk, { onConflict: "slug" });

        if (error) throw error;
        imported += chunk.length;
      }

      return new Response(
        JSON.stringify({
          success: true,
          rawRows: parsed.length,
          imported,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: corsHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
