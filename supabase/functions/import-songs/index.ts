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
    .replace(/\u00A0/g, " ") // spazi non breaking
    .replace(/\s+/g, " ") // più spazi consecutivi → 1
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
  return `${titolo.trim().toLowerCase()}-${artista.trim().toLowerCase()}`
    .normalize("NFKD") // rimuove accenti
    .replace(/[^\w\s-]/g, "") // rimuove simboli
    .replace(/\s+/g, "-"); // spazi → trattini
}

/* ------------------------------------------------------------------ */
/*  CSV Parser universale (gestisce virgolette e multilinea)          */
/* ------------------------------------------------------------------ */
function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];

    if (inQuotes) {
      if (c === '"' && csv[i + 1] === '"') {
        // doppia virgolette → escape
        field += '"';
        i++;
      } else if (c === '"') {
        // chiusura virgolette
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

    if (c === "," || c === ";") {
      // supporta sia CSV Google (,) sia Lovable (;)
      row.push(field);
      field = "";
      continue;
    }

    if (c === "\n") {
      row.push(field);
      field = "";
      rows.push([...row]);
      row = [];
      continue;
    }

    if (c === "\r") continue;

    field += c;
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push([...row]);
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/*  Parse CSV → SongData                                               */
/* ------------------------------------------------------------------ */
function parseSongs(csv: string): SongData[] {
  const rows = parseCsv(csv);
  if (!rows.length) return [];

  const songs: SongData[] = [];
  const dataRows = rows.slice(1); // salta header

  for (const row of dataRows) {
    const titoloRaw = row[0] ?? "";
    const artistaRaw = row[1] ?? "";
    const testoRaw = row[2] ?? "";

    const titolo = normalize(titoloRaw.replace(/^"(.*)"$/, "$1")); // rimuove virgolette residue
    const artista = normalize(artistaRaw.replace(/^"(.*)"$/, "$1"));
    const testo = normalizeLyrics(testoRaw.replace(/^"(.*)"$/, "$1"));

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
        duplicates.push({
          titolo: s.titolo,
          artista: s.artista,
          duplicateOf: `${prev.titolo} – ${prev.artista}`,
        });
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
        duplicates.push({
          titolo: s.titolo,
          artista: s.artista,
          duplicateOf: `${prev.titolo} – ${prev.artista}`,
        });
        if (s.testo.length > prev.testo.length) uniqueMap.set(s.slug, s);
      }

      const uniqueSongs = [...uniqueMap.values()];
      const chunkSize = 50;
      let imported = 0;
      const errorDetails: string[] = [];

      for (let i = 0; i < uniqueSongs.length; i += chunkSize) {
        const chunk = uniqueSongs.slice(i, i + chunkSize);
        const { error } = await supabase.from("songs").upsert(chunk, { onConflict: "slug" });
        if (error) errorDetails.push(`Chunk ${i}-${i + chunk.length}: ${error.message}`);
        else imported += chunk.length;
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
