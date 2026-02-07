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
    if (!csvContent) throw new Error("Contenuto CSV mancante");

    // CONFIGURAZIONE AVANZATA PAPAPARSE
    const parseResult = Papa.parse(csvContent, {
      header: false,
      skipEmptyLines: true,
      // 'quoteChar' istruisce il codice che tutto ciò che è tra " " è TESTO,
      // ignorando virgole o punti e virgola all'interno.
      quoteChar: '"',
      // 'escapeChar' gestisce i casi in cui nel testo c'è un simbolo di virgolette (es: "L'importante è "cantare"")
      escapeChar: '"',
      relaxQuotes: true,
    });

    const rows = parseResult.data as string[][];
    const songs = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 2) continue;

      const titolo = row[0]?.trim();
      const artista = row[1]?.trim();
      // Il testo ora viene preso integralmente, punteggiatura inclusa
      const testo = row[2]?.trim() || "";

      if (i === 0 && (titolo.toLowerCase().includes("titolo") || artista.toLowerCase().includes("artista"))) continue;

      if (titolo && artista) {
        // Creiamo uno slug che ignora la punteggiatura per l'URL
        const slug = `${titolo}-${artista}`
          .toLowerCase()
          .normalize("NFKD")
          .replace(/[^\w\s-]/g, "") // Rimuove tutto ciò che non è lettera, numero o spazio
          .replace(/\s+/g, "-") // Sostituisce spazi con trattini
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
