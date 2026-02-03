import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Song {
  id: string;
  titolo: string;
  artista: string;
  testo: string | null;
}

async function reformatLyricsWithAI(
  title: string,
  artist: string,
  lyrics: string
): Promise<string> {
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const prompt = `Sei un esperto di formattazione di testi musicali. Il tuo compito è riformattare il seguente testo di una canzone per renderlo perfettamente leggibile, in stile Spotify/Apple Music.

REGOLE DI FORMATTAZIONE:
1. Separa le strofe con UNA riga vuota tra di loro
2. Identifica i ritornelli (parti che si ripetono) e separali chiaramente
3. Se ci sono parti parlate o bridge, separale
4. Rimuovi spazi multipli inutili
5. Mantieni le maiuscole all'inizio di ogni verso
6. NON aggiungere etichette come [Strofa], [Ritornello], ecc. - solo il testo pulito
7. NON modificare le parole, solo la formattazione
8. Ogni verso su una riga separata
9. Usa righe vuote SOLO tra sezioni diverse (strofe, ritornelli)
10. NON mettere righe vuote tra i versi della stessa strofa

CANZONE: "${title}" di ${artist}

TESTO ORIGINALE:
${lyrics}

TESTO RIFORMATTATO (solo il testo, niente commenti o spiegazioni):`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("AI API error:", error);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const reformattedLyrics = data.choices?.[0]?.message?.content?.trim();

  if (!reformattedLyrics) {
    throw new Error("No response from AI");
  }

  return reformattedLyrics;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request body for optional parameters
    let batchSize = 10;
    let offset = 0;
    let songId: string | null = null;

    try {
      const body = await req.json();
      batchSize = body.batchSize || 10;
      offset = body.offset || 0;
      songId = body.songId || null;
    } catch {
      // No body provided, use defaults
    }

    let query = supabase
      .from("songs")
      .select("id, titolo, artista, testo")
      .not("testo", "is", null)
      .neq("testo", "");

    if (songId) {
      // Process single song
      query = query.eq("id", songId);
    } else {
      // Process batch
      query = query.range(offset, offset + batchSize - 1);
    }

    const { data: songs, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch songs: ${fetchError.message}`);
    }

    if (!songs || songs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No more songs to process",
          processed: 0,
          offset,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${songs.length} songs starting from offset ${offset}`);

    const results: { id: string; title: string; success: boolean; error?: string }[] = [];

    for (const song of songs) {
      try {
        console.log(`Reformatting: ${song.titolo} - ${song.artista}`);

        const reformattedLyrics = await reformatLyricsWithAI(
          song.titolo,
          song.artista,
          song.testo!
        );

        // Update the song in database
        const { error: updateError } = await supabase
          .from("songs")
          .update({ testo: reformattedLyrics })
          .eq("id", song.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        results.push({ id: song.id, title: song.titolo, success: true });
        console.log(`✓ Updated: ${song.titolo}`);

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`✗ Failed: ${song.titolo} - ${errorMessage}`);
        results.push({ id: song.id, title: song.titolo, success: false, error: errorMessage });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${songs.length} songs: ${successCount} success, ${failCount} failed`,
        processed: songs.length,
        successCount,
        failCount,
        nextOffset: offset + batchSize,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in reformat-lyrics:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
