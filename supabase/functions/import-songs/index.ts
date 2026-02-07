import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SongData {
  titolo: string;
  artista: string;
  testo: string;
  slug: string;
}

function normalize(input: string): string {
  return (input ?? "")
    .toString()
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLyrics(input: string): string {
  if (!input) return "";
  return input
    .toString()
    .replace(/\u00A0/g, " ") // Rimuove spazi unificatori (non-breaking spaces)
    .replace(/\r\n/g, "\n") // Normalizza i ritorni a capo Windows
    .replace(/\r/g, "\n") // Normalizza i ritorni a capo Mac
    .replace(/[ \t]+/g, " ") // Rimuove spazi multipli orizzontali
    .trim(); // Rimuove spazi/invii all'inizio e alla fine
}

function generateSlug(titolo: string, artista: string): string {
  const base = `${normalize(titolo)}-${normalize(artista)}`
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
  return base || `song-${Math.random().toString(36).slice(2, 7)}`;
}

// PARSER CARATTERE PER CARATTERE: Ignora qualsiasi numero di "a capo" se siamo tra virgolette
function parseCsv(csv: string): string[][] {
  const cleanCsv = csv.replace(/^\uFEFF/, ""); // Rimuove BOM
  const firstLine = cleanCsv.split("\n")[0];
  const sep = firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < cleanCsv.length; i++) {
    const char = cleanCsv[i];
    const nextChar = cleanCsv[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === sep) {
        currentRow.push(currentField);
        currentField = "";
      } else if (char === "\n") {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else if (char !== "\r") {
        currentField += char;
      }
    }
  }
  if (currentRow.length || currentField) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  return rows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { csvContent, action } = await req.json();
    if (!csvContent) throw new Error("CSV vuoto");

    const rows = parseCsv(csvContent);
    const songs: SongData[] = [];

    for (const row of rows) {
      const t = normalize(row[0] || "");
      const a = normalize(row[1] || "");
      const txt = normalizeLyrics(row[2] || "");

      // Salta se è l'intestazione o se mancano i dati fondamentali
      if (t.toLowerCase() === "titolo" || t.toLowerCase() === "title" || (!t && !a)) continue;

      songs.push({
        titolo: t,
        artista: a,
        testo: txt,
        slug: generateSlug(t, a),
      });
    }

    if (action === "parse") {
      return new Response(
        JSON.stringify({
          success: true,
          count: songs.length,
          preview: songs.slice(0, 3),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (action === "import") {
      if (songs.length === 0) throw new Error("Nessuna canzone valida trovata");

      // Upsert basato sullo slug
      const { error } = await supabase.from("songs").upsert(songs, { onConflict: "slug" });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, imported: songs.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), success: false }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
