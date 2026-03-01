const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import JSZip from 'https://esm.sh/jszip@3.10.1';

interface ChoRecord {
  title: string;
  artist: string | null;
  content: string;
  filename: string;
}

function extractChordProTitle(content: string): { title: string; artist: string } {
  const titleMatch = content.match(/\{(?:title|t):([^}]+)\}/i);
  const artistMatch = content.match(/\{(?:artist|a|subtitle|st):([^}]+)\}/i);
  return {
    title: titleMatch?.[1]?.trim() || 'Untitled',
    artist: artistMatch?.[1]?.trim() || '',
  };
}

function extractGDriveFolderId(url: string): string | null {
  // Matches: /folders/FOLDER_ID or ?id=FOLDER_ID
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

async function fetchGoogleDriveFiles(folderId: string, apiKey: string): Promise<{ id: string; name: string }[]> {
  const allFiles: { id: string; name: string }[] = [];
  let pageToken = '';

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      key: apiKey,
      pageSize: '1000',
      fields: 'nextPageToken,files(id,name,mimeType,size)',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const resp = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
    if (!resp.ok) {
      const errBody = await resp.text();
      throw new Error(`Google Drive API error ${resp.status}: ${errBody}`);
    }
    const data = await resp.json();
    const files = (data.files || []).filter((f: any) =>
      f.name.toLowerCase().endsWith('.cho')
    );
    allFiles.push(...files.map((f: any) => ({ id: f.id, name: f.name })));
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return allFiles;
}

async function downloadGDriveFile(fileId: string, apiKey: string): Promise<string> {
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!resp.ok) throw new Error(`Download failed for ${fileId}: ${resp.status}`);
  return await resp.text();
}

async function downloadAndExtractZip(url: string): Promise<ChoRecord[]> {
  const resp = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!resp.ok) throw new Error(`Failed to download ZIP: ${resp.status}`);
  const buffer = await resp.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const records: ChoRecord[] = [];

  for (const [filename, file] of Object.entries(zip.files)) {
    if ((file as any).dir) continue;
    const name = filename.split('/').pop() || filename;
    if (!name.toLowerCase().endsWith('.cho')) continue;
    try {
      const content = await (file as any).async('string');
      const { title, artist } = extractChordProTitle(content);
      records.push({
        title: title || name.replace(/\.cho$/i, ''),
        artist: artist || null,
        content,
        filename: name,
      });
    } catch {
      // skip unreadable files
    }
  }
  return records;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, googleApiKey } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: 'URL is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const records: ChoRecord[] = [];
    const errors: string[] = [];

    // Detect URL type
    const gDriveFolderId = extractGDriveFolderId(url);

    if (gDriveFolderId) {
      // Google Drive folder
      const apiKey = googleApiKey || Deno.env.get('GOOGLE_API_KEY');
      if (!apiKey) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Google API Key richiesta. Vai su console.cloud.google.com → API & Services → Credentials → Create API Key. Abilita "Google Drive API".',
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[import-songbook] Listing files in Google Drive folder: ${gDriveFolderId}`);
      const gFiles = await fetchGoogleDriveFiles(gDriveFolderId, apiKey);
      console.log(`[import-songbook] Found ${gFiles.length} .cho files`);

      // Download in parallel batches of 20
      const BATCH = 20;
      for (let i = 0; i < gFiles.length; i += BATCH) {
        const batch = gFiles.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map(async (f) => {
            const content = await downloadGDriveFile(f.id, apiKey);
            const { title, artist } = extractChordProTitle(content);
            return {
              title: title || f.name.replace(/\.cho$/i, ''),
              artist: artist || null,
              content,
              filename: f.name,
            } as ChoRecord;
          })
        );
        for (let j = 0; j < results.length; j++) {
          const r = results[j];
          if (r.status === 'fulfilled') {
            records.push(r.value);
          } else {
            errors.push(`${batch[j].name}: ${r.reason?.message || 'download failed'}`);
          }
        }
      }
    } else if (url.match(/\.zip(\?|$)/i) || url.includes('zip')) {
      // ZIP file URL
      console.log(`[import-songbook] Downloading ZIP from: ${url}`);
      const zipRecords = await downloadAndExtractZip(url);
      records.push(...zipRecords);
    } else if (url.match(/\.cho(\?|$)/i)) {
      // Single .cho file
      const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) throw new Error(`Failed to download .cho: ${resp.status}`);
      const content = await resp.text();
      const filename = url.split('/').pop()?.split('?')[0] || 'imported.cho';
      const { title, artist } = extractChordProTitle(content);
      records.push({
        title: title || filename.replace(/\.cho$/i, ''),
        artist: artist || null,
        content,
        filename,
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'URL non riconosciuto. Supportati: cartella Google Drive, file .zip, file .cho',
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert records in batches using upsert (filename unique)
    let successCount = 0;
    let duplicateCount = 0;
    const UPSERT_BATCH = 200;

    for (let i = 0; i < records.length; i += UPSERT_BATCH) {
      const batch = records.slice(i, i + UPSERT_BATCH);
      const { data, error } = await supabase
        .from('songbook_files')
        .upsert(batch, { onConflict: 'filename', ignoreDuplicates: true })
        .select('id');

      if (error) {
        console.error(`Batch ${Math.floor(i / UPSERT_BATCH) + 1} error:`, error);
        // Fallback: insert one by one
        for (const rec of batch) {
          const { error: singleErr } = await supabase
            .from('songbook_files')
            .insert(rec);
          if (!singleErr) {
            successCount++;
          } else if (singleErr.code === '23505') {
            duplicateCount++;
          } else {
            errors.push(`${rec.filename}: ${singleErr.message}`);
          }
        }
      } else {
        successCount += data?.length ?? batch.length;
      }
    }

    console.log(`[import-songbook] Done: ${successCount} imported, ${duplicateCount} duplicates, ${errors.length} errors`);

    return new Response(JSON.stringify({
      success: true,
      imported: successCount,
      duplicates: duplicateCount,
      total: records.length,
      errors: errors.slice(0, 50), // Cap at 50 error messages
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[import-songbook] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
