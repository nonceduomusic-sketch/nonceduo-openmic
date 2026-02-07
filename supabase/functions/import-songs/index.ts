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

// Funzione di pulizia specifica per i campi con virgolette
function cleanField(input: string): string {
  if (!input) return "";
  let clean = input.trim();
  // Rimuove virgolette all'inizio e alla fine se presenti
  if (clean.startsWith('"') && clean.endsWith('"')) {
    clean = clean.substring(1, clean.length - 1);
  }
  return clean.replace(/""/g, '"').trim();
}

function generateSlug(titolo: string, artista: string): string {
  return `${titolo}-${artista}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// PARSER SPECIFICO PER PUNTO E VIRGOLA E VIRGOLETTE
function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  // Rimuove eventuali caratteri invisibili iniziali
  const content = csv.replace(/^\uFEFF/, "");

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

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
      } else if (char === ";") {
        // Usiamo il punto e virgola come separatore certo
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
    if (!csvContent) throw new Error("File CSV non ricevuto");

    const rows = parseCsv(csvContent);
    const songs: SongData[] = [];

    for (const row of rows) {
      if (row.length < 2) continue;

      const t = cleanField(row[0]);
      const a = cleanField(row[1]);
      const txt = cleanField(row[2] || "");

      // Salta l'intestazione o righe vuote
      if (!t || t.toLowerCase() === "titolo" || a.toLowerCase() === "artista") continue;

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
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "import") {
      if (songs.length === 0) throw new Error("Nessuna canzone trovata");

      // Upsert basato sullo slug per non creare duplicati
      const { error } = await supabase.from("songs").upsert(songs, { onConflict: "slug" });
      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          imported: songs.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
