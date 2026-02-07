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
function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    if (row.length === 0) return;
    rows.push([...row]);
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
/*  Parse CSV → Songs                                                 */
/* ------------------------------------------------------------------ */
function parseSongs(csv: string): SongData[] {
  const rows = parseCsv(csv);
  if (rows.length <= 1) return [];

  const dataRows = rows.slice(1); // skip header
  const songs: SongData[] = [];

  for (const row of dataRows) {
    const titolo = normalize(row[0] ?? "");
    const artista = normalize(row[1] ?? "");
    const testo = normalizeLyrics(row[2] ?? "");

    if (!titolo || !artista) continue;

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
      return new Response(JSON.stringify({ error: "csvContent missing" }), { status: 400, headers: corsHeaders });
    }

    const parsed = parseSongs(csvContent);

    /* ---------------- PREVIEW ---------------- */
    if (action === "parse") {
      const uniqueMap = new Map<string, SongData>();
      const duplicates: { titolo: string; artista: string; duplicateOf: string }[] = [];

      for (const s of parsed) {
        const prev = uniqueMap.get(s.slug);
        if (!prev) {
          uniqueMap.set(s.slug, s);
          continue;
        }
        duplicates.push({ titolo: s.titolo, artista: s.artista, duplicateOf: `${prev.titolo} – ${prev.artista}` });
        if (s.testo.length > prev.testo.length) uniqueMap.set(s.slug, s);
      }

      return new Response(
        JSON.stringify({
          success: true,
          count: parsed.length,
          uniqueCount: uniqueMap.size,
          duplicatesCount: duplicates.length,
          duplicates,
          preview: [...uniqueMap.values()].slice(0, 5),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    /* ---------------- IMPORT ---------------- */
    if (action === "import") {
      const uniqueMap = new Map<string, SongData>();
      const duplicates: { titolo: string; artista: string; duplicateOf: string }[] = [];

      for (const s of parsed) {
        const prev = uniqueMap.get(s.slug);
        if (!prev) {
          uniqueMap.set(s.slug, s);
          continue;
        }
        duplicates.push({ titolo: s.titolo, artista: s.artista, duplicateOf: `${prev.titolo} – ${prev.artista}` });
        if (s.testo.length > prev.testo.length) uniqueMap.set(s.slug, s);
      }

      const uniqueSongs = [...uniqueMap.values()];
      const chunkSize = 50;
      let imported = 0;
      const errorDetails: string[] = [];

      for (let i = 0; i < uniqueSongs.length; i += chunkSize) {
        const chunk = uniqueSongs.slice(i, i + chunkSize);
        const { error } = await supabase.from("songs").upsert(chunk, { onConflict: "slug" });
        if (error) {
          errorDetails.push(`Chunk ${i}-${i + chunk.length}: ${error.message}`);
        } else {
          imported += chunk.length;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          imported,
          errors: errorDetails.length,
          errorDetails: errorDetails.slice(0, 10),
          total: uniqueSongs.length,
          totalRaw: parsed.length,
          duplicatesCount: duplicates.length,
          duplicates,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
