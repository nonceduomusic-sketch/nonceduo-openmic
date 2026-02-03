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
  const s = raw.replace(/\u00A0/g, " ").trim();
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
      titolo: split.titolo,
      artista: split.artista,
      testo: (testoRaw ?? "").toString().trim(),
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
      console.log(`[import-songs] parse: rows=${songs.length}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          count: songs.length,
          preview: songs.slice(0, 5).map(s => ({ titolo: s.titolo, artista: s.artista }))
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === 'import') {
      const songs = parseCSV(csvContent);
      console.log(`[import-songs] import: rows=${songs.length}`);
      
      let imported = 0;
      let errors = 0;
      const errorDetails: string[] = [];
      
      // Batch insert in chunks of 50
      const chunkSize = 50;
      for (let i = 0; i < songs.length; i += chunkSize) {
        const chunk = songs.slice(i, i + chunkSize);
        
        const { data, error } = await supabase
          .from('songs')
          .upsert(
            chunk.map(song => ({
              titolo: song.titolo,
              artista: song.artista,
              testo: song.testo
            })),
            { 
              onConflict: 'titolo,artista',
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
          total: songs.length
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
