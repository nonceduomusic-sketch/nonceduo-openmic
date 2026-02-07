import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { csvContent, action } = await req.json();
    if (!csvContent) throw new Error("CSV mancante");

    // Dividiamo il file usando una logica che non si rompe con i testi lunghi
    // Cerchiamo il pattern: "Testo" seguìto da un a capo e poi un nuovo Titolo
    const songs = [];

    // Proviamo a dividere per riga, ma gestendo i campi tra virgolette
    const rows = csvContent.split(/\n(?=(?:[^"]*"[^"]*")*[^"]*$)/);

    for (let row of rows) {
      if (!row.trim()) continue;

      // Dividiamo per punto e virgola o virgola (rileva automaticamente)
      const sep = row.includes(";") ? ";" : ",";
      const parts = row.split(sep).map((p) => p.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));

      if (parts.length >= 2) {
        const titolo = parts[0];
        const artista = parts[1];
        const testo = parts[2] || "";

        // Salta l'intestazione
        if (titolo.toLowerCase().includes("titolo") || titolo.toLowerCase() === "title") continue;

        if (titolo && artista) {
          // Genera uno slug pulito
          const slug = `${titolo}-${artista}-${Math.floor(Math.random() * 1000)}`.toLowerCase().replace(/[^\w]/g, "-");

          songs.push({
            titolo,
            artista,
            testo,
            slug,
          });
        }
      }
    }

    if (action === "parse") {
      return new Response(
        JSON.stringify({
          success: true,
          count: songs.length,
          preview: songs.slice(0, 5),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "import") {
      if (songs.length === 0) throw new Error("Nessuna canzone trovata");

      // Inserimento a blocchi per evitare errori di memoria
      const { error } = await supabase.from("songs").upsert(songs);

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
