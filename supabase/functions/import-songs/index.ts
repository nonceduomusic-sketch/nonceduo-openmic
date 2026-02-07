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

    // PAPA PARSE: La soluzione definitiva per CSV complessi
    const parseResult = Papa.parse(csvContent, {
      header: false, // Leggiamo come array per gestire meglio i nomi colonne variabili
      skipEmptyLines: true,
      relaxQuotes: true, // Gestisce meglio virgolette sporche
    });

    const rows = parseResult.data as string[][];
    const songs = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Pulizia dei campi
      const titolo = (row[0] || "").trim();
      const artista = (row[1] || "").trim();
      const testo = (row[2] || "").trim();

      // Salta l'intestazione (se la prima riga contiene "Titolo")
      if (i === 0 && titolo.toLowerCase().includes("titolo")) continue;

      if (titolo && artista) {
        // Generiamo uno slug pulito ma unico
        const slug = `${titolo}-${artista}`
          .toLowerCase()
          .normalize("NFKD")
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
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
          detectedDelimiter: parseResult.meta.delimiter, // Ci dice cosa ha trovato (, o ;)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "import") {
      if (songs.length === 0) throw new Error("Nessuna canzone valida trovata");

      // Usiamo upsert per aggiornare se esiste già o inserire se nuova
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
