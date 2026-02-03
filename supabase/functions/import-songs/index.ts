import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SongData {
  titolo: string;
  artista: string;
  testo: string;
}

function parseCSV(csvContent: string): SongData[] {
  const songs: SongData[] = [];
  const lines = csvContent.split('\n');
  
  let currentSong: SongData | null = null;
  let currentTesto: string[] = [];
  
  for (let i = 1; i < lines.length; i++) { // Skip header
    const line = lines[i];
    
    // Check if this is a new song (starts with a title pattern and contains the separator)
    const newSongMatch = line.match(/^([^,]+)\s[–-]\s([^,]+),(.*)$/);
    
    if (newSongMatch) {
      // Save previous song if exists
      if (currentSong) {
        currentSong.testo = currentTesto.join('\n').replace(/^"|"$/g, '').trim();
        if (currentSong.titolo && currentSong.artista) {
          songs.push(currentSong);
        }
      }
      
      // Parse new song
      const titoloArtista = newSongMatch[1] + ' – ' + newSongMatch[2];
      const parts = titoloArtista.split(/\s[–-]\s/);
      
      if (parts.length >= 2) {
        currentSong = {
          titolo: parts[0].trim(),
          artista: parts.slice(1).join(' – ').trim(),
          testo: ''
        };
        currentTesto = [newSongMatch[3] || ''];
      }
    } else if (currentSong) {
      // This is a continuation of the lyrics
      currentTesto.push(line);
    }
  }
  
  // Don't forget the last song
  if (currentSong) {
    currentSong.testo = currentTesto.join('\n').replace(/^"|"$/g, '').trim();
    if (currentSong.titolo && currentSong.artista) {
      songs.push(currentSong);
    }
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

    if (action === 'parse') {
      // Just parse and return count for preview
      const songs = parseCSV(csvContent);
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
