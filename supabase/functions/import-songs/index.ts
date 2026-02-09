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
  return (input ?? "").toString().replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeLyrics(input: string): string {
  return (input ?? "").toString()
    .replace(/\u00A0/g, " ").replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function generateSlug(titolo: string, artista: string): string {
  return `${titolo.trim().toLowerCase()}-${artista.trim().toLowerCase()}`
    .normalize("NFKD").replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
}

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const normalizedCsv = csv.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < normalizedCsv.length; i++) {
    const c = normalizedCsv[i];
    if (inQuotes) {
      if (c === '"') {
        if (normalizedCsv[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else { field += c; }
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === "," || c === ";") { row.push(field); field = ""; continue; }
    if (c === "\n") {
      row.push(field); field = "";
      if (row.length > 0 && row.some(f => f.trim())) rows.push([...row]);
      row = []; continue;
    }
    field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.length > 0 && row.some(f => f.trim())) rows.push([...row]);
  }
  return rows;
}

function parseSongs(csv: string): SongData[] {
  const rows = parseCsv(csv);
  if (!rows.length) return [];
  const songs: SongData[] = [];
  const firstRow = rows[0];
  const isHeader = firstRow.some(cell =>
    cell.toLowerCase().includes('titolo') || cell.toLowerCase().includes('artista') || cell.toLowerCase().includes('testo')
  );
  const dataRows = isHeader ? rows.slice(1) : rows;
  for (const row of dataRows) {
    if (!row.length || row.every(cell => !cell.trim())) continue;
    const titolo = normalize(row[0] ?? "");
    const artista = normalize(row[1] ?? "");
    const testo = normalizeLyrics(row[2] ?? "");
    if (!titolo || !artista) continue;
    const slug = generateSlug(titolo, artista);
    songs.push({ titolo, artista, testo, slug });
  }
  return songs;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { csvContent, action, selectedSlugs } = await req.json();

    if (!csvContent) {
      return new Response(JSON.stringify({ error: "csvContent missing" }), { status: 400, headers: corsHeaders });
    }

    const parsed = parseSongs(csvContent);

    /* ---------------- PARSE (with existing check) ---------------- */
    if (action === "parse") {
      const uniqueMap = new Map<string, SongData>();
      const duplicates: { titolo: string; artista: string; duplicateOf: string }[] = [];

      for (const s of parsed) {
        const prev = uniqueMap.get(s.slug);
        if (!prev) { uniqueMap.set(s.slug, s); continue; }
        duplicates.push({ titolo: s.titolo, artista: s.artista, duplicateOf: `${prev.titolo} – ${prev.artista}` });
        if (s.testo.length > prev.testo.length) uniqueMap.set(s.slug, s);
      }

      // Check which slugs already exist in the database
      const allSlugs = [...uniqueMap.keys()];
      const existingSlugs = new Set<string>();
      const chunkSize = 200;
      for (let i = 0; i < allSlugs.length; i += chunkSize) {
        const chunk = allSlugs.slice(i, i + chunkSize);
        const { data } = await supabase.from("songs").select("slug").in("slug", chunk);
        if (data) data.forEach((r: { slug: string }) => existingSlugs.add(r.slug));
      }

      // Build full list with existing flag
      const allSongs = [...uniqueMap.values()].map(s => ({
        titolo: s.titolo,
        artista: s.artista,
        slug: s.slug,
        hasText: s.testo.length > 0,
        existsInDb: existingSlugs.has(s.slug),
      }));

      return new Response(
        JSON.stringify({
          success: true,
          count: parsed.length,
          uniqueCount: uniqueMap.size,
          existingCount: existingSlugs.size,
          newCount: uniqueMap.size - existingSlugs.size,
          duplicatesCount: duplicates.length,
          duplicates,
          allSongs,
          preview: allSongs.slice(0, 5),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    /* ---------------- IMPORT (supports selective) ---------------- */
    if (action === "import") {
      const uniqueMap = new Map<string, SongData>();
      const duplicates: { titolo: string; artista: string; duplicateOf: string }[] = [];

      for (const s of parsed) {
        const prev = uniqueMap.get(s.slug);
        if (!prev) { uniqueMap.set(s.slug, s); continue; }
        duplicates.push({ titolo: s.titolo, artista: s.artista, duplicateOf: `${prev.titolo} – ${prev.artista}` });
        if (s.testo.length > prev.testo.length) uniqueMap.set(s.slug, s);
      }

      // If selectedSlugs provided, filter to only those
      let songsToImport: SongData[];
      if (selectedSlugs && Array.isArray(selectedSlugs) && selectedSlugs.length > 0) {
        const selectedSet = new Set(selectedSlugs as string[]);
        songsToImport = [...uniqueMap.values()].filter(s => selectedSet.has(s.slug));
      } else {
        songsToImport = [...uniqueMap.values()];
      }

      const importChunkSize = 50;
      let imported = 0;
      const errorDetails: string[] = [];

      for (let i = 0; i < songsToImport.length; i += importChunkSize) {
        const chunk = songsToImport.slice(i, i + importChunkSize);
        const { error } = await supabase.from("songs").upsert(chunk, { onConflict: "slug" });
        if (error) errorDetails.push(`Chunk ${i}-${i + chunk.length}: ${error.message}`);
        else imported += chunk.length;
      }

      return new Response(
        JSON.stringify({
          success: true,
          imported,
          errors: errorDetails.length,
          errorDetails: errorDetails.slice(0, 10),
          total: songsToImport.length,
          totalRaw: parsed.length,
          duplicatesCount: duplicates.length,
          duplicates,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
