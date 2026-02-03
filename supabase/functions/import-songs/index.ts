import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SongData {
  titolo: string;
  artista: string;
  testo: string;
}

function normalizeSpaces(input: string): string {
  return (input ?? "")
    .toString()
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Preserve newlines but normalize other whitespace
function normalizeLyricsText(input: string): string {
  return (input ?? "")
    .toString()
    .replace(/\u00A0/g, " ")           // Non-breaking spaces → regular spaces
    .replace(/\r\n/g, "\n")            // Windows CRLF → LF
    .replace(/\r/g, "\n")              // Old Mac CR → LF
    .replace(/[ \t]+/g, " ")           // Multiple spaces/tabs → single space (but preserve \n)
    .replace(/\n /g, "\n")             // Remove leading space after newline
    .replace(/ \n/g, "\n")             // Remove trailing space before newline
    .replace(/\n{3,}/g, "\n\n")        // Max 2 consecutive newlines
    .trim();
}

// Must match DB trigger logic generate_song_slug() as closely as possible
function generateSlug(titolo: string, artista: string): string {
  const raw = `${normalizeSpaces(titolo)}-${normalizeSpaces(artista)}`;
  const cleaned = raw.replace(/[^a-zA-Z0-9\s-]/g, "");
  return cleaned.replace(/\s+/g, "-").toLowerCase();
}

function parseTwoColumnCsv(csvContent: string): Array<[string, string]> {
  // Minimal CSV parser with:
  // - comma delimiter
  // - quoted fields
  // - escaped quotes ("")
  // - newlines inside quoted fields
  const rows: Array<[string, string]> = [];

  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    // Skip empty rows
    if (row.length === 0 || (row.length === 1 && row[0].trim() === "")) {
      row = [];
      return;
    }

    // We expect 2 columns, but if there are more, we join extras into the 2nd.
    const col1 = (row[0] ?? "").toString();
    const col2 = row.length <= 2 ? (row[1] ?? "") : row.slice(1).join(",");
    rows.push([col1, col2]);
    row = [];
  };

  for (let i = 0; i < csvContent.length; i++) {
    const c = csvContent[i];

    if (inQuotes) {
      if (c === '"') {
        const next = csvContent[i + 1];
        if (next === '"') {
          field += '"';
          i++; // consume escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      continue;
    }

    if (c === ',') {
      pushField();
      continue;
    }

    if (c === '\n') {
      pushField();
      pushRow();
      continue;
    }

    // Ignore CR in CRLF
    if (c === '\r') continue;

    field += c;
  }

  // finalize last row
  if (inQuotes) {
    // if file ends while still in quotes, we still try to salvage
    inQuotes = false;
  }
  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

  return rows;
}

function splitTitoloArtista(raw: string): { titolo: string; artista: string } | null {
  const s = normalizeSpaces(raw);
  // Prefer the LAST separator occurrence (titles can contain hyphens)
  const re = /\s[–—-]\s/g;
  let lastIndex = -1;
  let lastLen = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    lastIndex = m.index;
    lastLen = m[0].length;
  }
  if (lastIndex < 0) return null;

  const titolo = s.slice(0, lastIndex).trim();
  const artista = s.slice(lastIndex + lastLen).trim();
  if (!titolo || !artista) return null;
  return { titolo, artista };
}

function parseCSV(csvContent: string): SongData[] {
  const rows = parseTwoColumnCsv(csvContent);
  if (rows.length === 0) return [];

  // Skip header row (first row)
  const dataRows = rows.slice(1);
  const songs: SongData[] = [];

  for (const [titoloArtistaRaw, testoRaw] of dataRows) {
    const split = splitTitoloArtista(titoloArtistaRaw);
    if (!split) continue;

    songs.push({
      titolo: normalizeSpaces(split.titolo),
      artista: normalizeSpaces(split.artista),
      testo: normalizeLyricsText((testoRaw ?? "").toString()), // Preserve newlines!
    });
  }

  return songs;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { csvContent, action } = await req.json();
    if (!csvContent || typeof csvContent !== 'string') {
      return new Response(
        JSON.stringify({ error: "Missing csvContent" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === 'parse') {
      // Just parse and return count for preview
      const songs = parseCSV(csvContent);
      const uniqueBySlug = new Map<string, SongData & { slug: string }>();
      const duplicates: Array<{ titolo: string; artista: string; duplicateOf: string }> = [];
      
      for (const s of songs) {
        const slug = generateSlug(s.titolo, s.artista);
        const prev = uniqueBySlug.get(slug);
        if (!prev) {
          uniqueBySlug.set(slug, { ...s, slug });
          continue;
        }
        // Track duplicate
        duplicates.push({
          titolo: s.titolo,
          artista: s.artista,
          duplicateOf: `${prev.titolo} – ${prev.artista}`
        });
        // Keep the version with longer lyrics (usually more complete)
        if ((s.testo?.length ?? 0) > (prev.testo?.length ?? 0)) {
          uniqueBySlug.set(slug, { ...s, slug });
        }
      }
      const uniqueSongs = Array.from(uniqueBySlug.values());
      console.log(`[import-songs] parse: rows=${songs.length}, unique=${uniqueSongs.length}, duplicates=${duplicates.length}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          count: songs.length,
          uniqueCount: uniqueSongs.length,
          duplicatesCount: duplicates.length,
          duplicates: duplicates, // Full list of duplicates
          preview: uniqueSongs.slice(0, 5).map(s => ({ titolo: s.titolo, artista: s.artista }))
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === 'import') {
      const songs = parseCSV(csvContent);

      // Deduplicate within the payload to avoid:
      // - 21000: "ON CONFLICT DO UPDATE command cannot affect row a second time"
      // - 23505 on songs_slug_key when titolo/artista differ only by punctuation/case/spacing
      const uniqueBySlug = new Map<string, SongData & { slug: string }>();
      const duplicates: Array<{ titolo: string; artista: string; duplicateOf: string }> = [];
      
      for (const s of songs) {
        const slug = generateSlug(s.titolo, s.artista);
        const prev = uniqueBySlug.get(slug);
        if (!prev) {
          uniqueBySlug.set(slug, { ...s, slug });
          continue;
        }
        // Track duplicate
        duplicates.push({
          titolo: s.titolo,
          artista: s.artista,
          duplicateOf: `${prev.titolo} – ${prev.artista}`
        });
        // Keep the row with the longest lyrics
        if ((s.testo?.length ?? 0) > (prev.testo?.length ?? 0)) {
          uniqueBySlug.set(slug, { ...s, slug });
        }
      }
      const uniqueSongs = Array.from(uniqueBySlug.values());

      console.log(`[import-songs] import: rows=${songs.length}, unique=${uniqueSongs.length}, duplicates=${duplicates.length}`);
      
      let imported = 0;
      let errors = 0;
      const errorDetails: string[] = [];
      
      // Batch insert in chunks of 50
      const chunkSize = 50;
      for (let i = 0; i < uniqueSongs.length; i += chunkSize) {
        const chunk = uniqueSongs.slice(i, i + chunkSize);
        
        const { data, error } = await supabase
          .from('songs')
          .upsert(
            chunk.map(song => ({
              titolo: song.titolo,
              artista: song.artista,
              testo: song.testo,
              slug: song.slug,
            })),
            { 
              // Conflict on slug because slug is normalized+unique (see DB trigger generate_song_slug)
              // This prevents failures when titolo/artista differ only by punctuation/case.
              onConflict: 'slug',
              ignoreDuplicates: false 
            }
          );
        
        if (error) {
          errors += chunk.length;
          errorDetails.push(`Chunk ${i}-${i + chunk.length}: ${error.message}`);
          console.error(`[import-songs] chunk error ${i}-${i + chunk.length}:`, error);
        } else {
          imported += chunk.length;
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          imported,
          errors,
          errorDetails: errorDetails.slice(0, 10),
          total: uniqueSongs.length,
          totalRaw: songs.length,
          duplicatesCount: duplicates.length,
          duplicates: duplicates, // Full list for UI display
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
