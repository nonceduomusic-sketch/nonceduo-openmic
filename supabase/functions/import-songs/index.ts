import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Papa from "https://esm.sh/papaparse@5.4.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { csvContent, action } = await req.json();
    if (!csvContent) throw new Error("File vuoto");

    // PARSER ADATTIVO
    const parseResult = Papa.parse(csvContent, {
      header: false,
      skipEmptyLines: true,
      relaxQuotes: true, // Fondamentale: non si blocca se le virgolette sono messe male
      quoteChar: '"',
      escapeChar: '"', // Gestisce le doppie virgolette "" trasformandole in una sola
    });

    const rows = parseResult.data as string[][];
    const songs = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 2) continue;

      // Pulizia profonda: rimuove i residui di virgolette e spazi strani
      let titolo = (row[0] || "").trim().replace(/^"|"$/g, "");
      let artista = (row[1] || "").trim().replace(/^"|"$/g, "");
      let testo = (row[2] || "").trim();

      // Salta l'intestazione se presente
      if (titolo.toLowerCase() === "titolo" || titolo.toLowerCase() === "title") continue;

      if (titolo && artista) {
        // Genera slug semplice
        const slug = `${titolo}-${artista}`
          .toLowerCase()
          .normalize("NFKD")
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim();

        songs.push({ titolo, artista, testo, slug });
      }
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

      // Upsert basato sullo slug
      const { error } = await supabase.from("songs").upsert(songs, { onConflict: "slug" });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, imported: songs.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
