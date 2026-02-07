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
    if (!csvContent) throw new Error("File vuoto");

    // Dividiamo il file riga per riga in modo brutale
    const lines = csvContent.split(/\r?\n/);
    const songs = [];

    let currentSong = null;

    for (let line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Cerchiamo di capire se questa riga è l'inizio di una nuova canzone
      // Formato atteso: "Titolo";"Artista";"Inizio testo...
      // Oppure: Titolo;Artista;Testo
      const parts = line.split(";");

      // Se la riga ha almeno 2 punti e virgola, probabilmente è un nuovo inizio
      if (parts.length >= 3 && parts[0].length > 0 && parts[0].length < 100) {
        // Se avevamo una canzone in sospeso, salviamola
        if (currentSong) songs.push(currentSong);

        const titolo = parts[0].replace(/"/g, "").trim();
        const artista = parts[1].replace(/"/g, "").trim();

        // Salto l'intestazione
        if (titolo.toLowerCase() === "titolo") {
          currentSong = null;
          continue;
        }

        currentSong = {
          titolo,
          artista,
          testo: parts.slice(2).join(";").replace(/^"|"/g, "").trim(),
          slug: `${titolo}-${artista}-${Math.floor(Math.random() * 1000)}`.toLowerCase().replace(/[^\w]/g, "-"),
        };
      } else if (currentSong) {
        // Se non è un nuovo inizio, è il seguito del testo della canzone precedente
        currentSong.testo += "\n" + line.replace(/"/g, "").trim();
      }
    }

    // Aggiungi l'ultima canzone rimasta nel ciclo
    if (currentSong) songs.push(currentSong);

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
      const { error } = await supabase.from("songs").upsert(songs);
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
