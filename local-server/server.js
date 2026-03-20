/**
 * NonceDuo Local Broadcast Server
 * 
 * 1. HTTP Server (porta 8080) — serve i file dell'app (SPA con fallback a index.html)
 *    + API per catalogo canzoni e SongBook (.cho) offline
 * 2. WebSocket Server (porta 3456) — sincronizza stato broadcast tra dispositivi LAN
 */

const { WebSocketServer } = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const HTTP_PORT = 8080;
const WS_PORT = 3456;

// Directory contenente la build dell'app (npm run build → dist/)
const PUBLIC_DIR = path.join(__dirname, 'public');

// Directory per i dati locali (catalogo e songbook)
const DATA_DIR = path.join(__dirname, 'data');
const SONGBOOK_DIR = path.join(DATA_DIR, 'songbook');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');
const SONGBOOK_IDS_FILE = path.join(DATA_DIR, 'songbook-ids.json');

// Assicura che le cartelle dati esistano
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SONGBOOK_DIR)) fs.mkdirSync(SONGBOOK_DIR, { recursive: true });

// ═══════════════════════════════════════
// MIME Types per il server HTTP
// ═══════════════════════════════════════
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.mp3':  'audio/mpeg',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.wasm': 'application/wasm',
  '.txt':  'text/plain; charset=utf-8',
  '.xml':  'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.cho':  'text/plain; charset=utf-8',
};

// ═══════════════════════════════════════
// API Helpers
// ═══════════════════════════════════════
function sendJSON(res, data, status = 200) {
  res.writeHead(status, { 
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function getStaticHeaders(urlPath, ext, isIndexFallback = false) {
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  const isHtml = ext === '.html' || isIndexFallback;
  const isServiceWorker = urlPath === '/sw.js' || urlPath.startsWith('/workbox-');
  const isManifest = ext === '.webmanifest';

  if (isHtml || isServiceWorker || isManifest) {
    return {
      'Content-Type': mime,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    };
  }

  return {
    'Content-Type': mime,
    'Cache-Control': 'public, max-age=300',
  };
}

// ═══════════════════════════════════════
// SongBook API — file .cho nella cartella data/songbook/
// ═══════════════════════════════════════
// Mapping filename → Supabase UUID (populated during sync)
function getSongbookIdMap() {
  try {
    if (fs.existsSync(SONGBOOK_IDS_FILE)) {
      return JSON.parse(fs.readFileSync(SONGBOOK_IDS_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function getSongbookList() {
  try {
    const files = fs.readdirSync(SONGBOOK_DIR).filter(f => f.endsWith('.cho'));
    const idMap = getSongbookIdMap();
    return files.map(filename => {
      const content = fs.readFileSync(path.join(SONGBOOK_DIR, filename), 'utf-8');
      const title = (content.match(/\{title:\s*(.+?)\}/i) || [])[1] || filename.replace('.cho', '');
      const artist = (content.match(/\{artist:\s*(.+?)\}/i) || [])[1] || null;
      const slug = filename.replace('.cho', '').toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const isVariant = filename.includes('_');
      const supabase_id = idMap[filename] || null;
      return { id: slug, supabase_id, title: title.trim(), artist: artist?.trim() || null, filename, slug, is_variant: isVariant };
    });
  } catch (e) {
    console.error('❌ Errore lettura songbook:', e.message);
    return [];
  }
}

function getSongbookFile(identifier) {
  const list = getSongbookList();
  // Match by supabase_id (UUID), slug, or local id
  const entry = list.find(f => f.supabase_id === identifier || f.slug === identifier || f.id === identifier);
  if (!entry) return null;
  const content = fs.readFileSync(path.join(SONGBOOK_DIR, entry.filename), 'utf-8');
  return { ...entry, content };
}

// ═══════════════════════════════════════
// Catalog API — catalog.json nella cartella data/
// ═══════════════════════════════════════
function getCatalog() {
  try {
    if (fs.existsSync(CATALOG_FILE)) {
      return JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'));
    }
    return [];
  } catch (e) {
    console.error('❌ Errore lettura catalogo:', e.message);
    return [];
  }
}

function saveCatalog(songs) {
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(songs, null, 2), 'utf-8');
}

// ═══════════════════════════════════════
// HTTP Server — SPA + API
// ═══════════════════════════════════════
const httpServer = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const urlPath = req.url.split('?')[0];

  // ── API Routes ──
  
  // Ping endpoint (per auto-sync check)
  if (urlPath === '/api/ping' && req.method === 'GET') {
    return sendJSON(res, { ok: true, ts: Date.now() });
  }

  // Sync PIN display state for local /trasmetti pages
  if (urlPath === '/api/pin-display/sync' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const updates = {
        pin_code: typeof body.pin_code === 'string' && body.pin_code.trim()
          ? body.pin_code.trim().toUpperCase()
          : null,
        show_pin_on_gate: Boolean(body.show_pin_on_gate),
        pin_required: Boolean(body.pin_required),
      };

      Object.assign(broadcastState, updates);

      const outMsg = JSON.stringify({ type: 'update', data: updates });
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(outMsg);
        }
      });

      return sendJSON(res, { ok: true, ...updates });
    } catch (e) {
      return sendJSON(res, { error: 'JSON non valido' }, 400);
    }
  }

  // SongBook: lista brani
  if (urlPath === '/api/songbook/list' && req.method === 'GET') {
    return sendJSON(res, getSongbookList());
  }

  // SongBook: tutti i brani con contenuto (per download bulk)
  if (urlPath === '/api/songbook/all' && req.method === 'GET') {
    const list = getSongbookList();
    const all = list.map(entry => {
      const content = fs.readFileSync(path.join(SONGBOOK_DIR, entry.filename), 'utf-8');
      return { ...entry, content };
    });
    return sendJSON(res, all);
  }

  // SongBook: singolo brano per slug
  if (urlPath.startsWith('/api/songbook/') && req.method === 'GET') {
    const slug = urlPath.replace('/api/songbook/', '');
    if (slug && slug !== 'list' && slug !== 'all') {
      const file = getSongbookFile(slug);
      if (file) return sendJSON(res, file);
      return sendJSON(res, { error: 'File non trovato' }, 404);
    }
  }

  // Catalogo: lista brani
  if (urlPath === '/api/catalog/list' && req.method === 'GET') {
    return sendJSON(res, getCatalog());
  }

  // Catalogo: sync (POST) — riceve l'intero catalogo dal cloud e lo salva
  if (urlPath === '/api/catalog/sync' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      if (Array.isArray(body)) {
        saveCatalog(body);
        console.log(`📦 Catalogo sincronizzato: ${body.length} brani`);
        return sendJSON(res, { ok: true, count: body.length });
      }
      return sendJSON(res, { error: 'Body deve essere un array' }, 400);
    } catch (e) {
      return sendJSON(res, { error: 'JSON non valido' }, 400);
    }
  }

  // SongBook: sync (POST) — riceve tutti i file songbook e li salva
  if (urlPath === '/api/songbook/sync' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      if (Array.isArray(body)) {
        // Ogni elemento: { filename, content, id? (Supabase UUID) }
        let count = 0;
        const idMap = getSongbookIdMap();
        for (const file of body) {
          if (file.filename && file.content) {
            const safeName = file.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            fs.writeFileSync(path.join(SONGBOOK_DIR, safeName), file.content, 'utf-8');
            // Save Supabase UUID mapping if provided
            if (file.id) {
              idMap[safeName] = file.id;
            }
            count++;
          }
        }
        // Persist UUID mapping
        fs.writeFileSync(SONGBOOK_IDS_FILE, JSON.stringify(idMap, null, 2), 'utf-8');
        console.log(`📦 SongBook sincronizzato: ${count} file .cho (${Object.keys(idMap).length} UUID mappati)`);
        return sendJSON(res, { ok: true, count });
      }
      return sendJSON(res, { error: 'Body deve essere un array' }, 400);
    } catch (e) {
      return sendJSON(res, { error: 'JSON non valido' }, 400);
    }
  }

  // ── Static file serving ──
  let filePath = path.join(PUBLIC_DIR, urlPath);
  
  // Security: prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // If it's a directory, try index.html inside it
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // Serve the file if it exists
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, getStaticHeaders(urlPath, ext));
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // SPA Fallback: serve index.html for any route (React Router handles it)
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, getStaticHeaders('/index.html', '.html', true));
    fs.createReadStream(indexPath).pipe(res);
  } else {
    res.writeHead(404);
    res.end(`
      <h1>⚠️ Cartella "public" non trovata</h1>
      <p>Devi copiare la build dell'app nella cartella <code>${PUBLIC_DIR}</code></p>
      <p>Sul tuo PC Lovable: scarica il progetto e fai <code>npm run build</code>, poi copia il contenuto di <code>dist/</code> qui.</p>
    `);
  }
});

// ═══════════════════════════════════════
// Broadcast State (WebSocket)
// ═══════════════════════════════════════
let broadcastState = {
  songbook_file_id: null,
  songbook_mode: false,
  songbook_show_chords_on_tv: false,
  songbook_transpose: 0,
  songbook_view_mode: 'compact',
  display_mode: 'waiting',
  scroll_position: 0,
  highlight_line: 0,
  highlight_enabled: true,
  highlight_lines_count: 2,
  font_size: 100,
  text_align: 'center',
  is_active: false,
  is_broadcasting: false,
  auto_scroll: false,
  auto_scroll_active: false,
  auto_scroll_bpm: 60,
  current_song_id: null,
  current_reservation_id: null,
  pin_code: null,
  show_pin_on_gate: false,
  pin_required: false,
  cached_songs: {},
  // TV standby & display settings
  tv_standby_mode: 'openmic',
  tv_title: null,
  tv_subtitle: null,
  tv_footer: null,
  tv_logo_url: null,
  tv_logo_scale: 100,
  tv_qr_url: null,
  tv_qr_cta: null,
  tv_show_title: true,
  tv_show_subtitle: true,
  tv_show_logo: true,
  tv_show_qr: true,
  tv_show_footer: true,
  tv_show_status: true,
  tv_view_mode: null,
  tv_element_positions: null,
};

// ═══════════════════════════════════════
// WebSocket Server
// ═══════════════════════════════════════
const wss = new WebSocketServer({ port: WS_PORT });
let clientCount = 0;

wss.on('connection', (ws, req) => {
  clientCount++;
  const clientIP = req.socket.remoteAddress;
  console.log(`✅ WS Client connesso: ${clientIP} (${clientCount} totali)`);

  ws.send(JSON.stringify({ type: 'state', data: broadcastState }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'update': {
          const updates = msg.data || {};
          Object.assign(broadcastState, updates);
          const outMsg = JSON.stringify({ type: 'update', data: updates });
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === 1) {
              client.send(outMsg);
            }
          });
          break;
        }

        case 'cache_song': {
          const { id, title, artist, content } = msg.data || {};
          if (id && content) {
            broadcastState.cached_songs[id] = { id, title, artist, content };
            console.log(`📝 Canzone cachata: ${title || id}`);
          }
          break;
        }

        case 'get_song': {
          // 1) Check in-memory cache first
          let song = broadcastState.cached_songs[msg.id];
          // 2) Fallback: search songbook filesystem by supabase_id/slug/id
          if (!song) {
            const fileMatch = getSongbookFile(msg.id);
            if (fileMatch) {
              song = { id: fileMatch.supabase_id || fileMatch.id, title: fileMatch.title, artist: fileMatch.artist, content: fileMatch.content };
              broadcastState.cached_songs[msg.id] = song;
            }
          }
          // 3) Fallback: search catalog.json by id
          if (!song) {
            const catalog = getCatalog();
            const catalogMatch = catalog.find(s => s.id === msg.id);
            if (catalogMatch) {
              song = {
                id: catalogMatch.id,
                title: catalogMatch.titolo || catalogMatch.title || '',
                artist: catalogMatch.artista || catalogMatch.artist || '',
                content: catalogMatch.testo || catalogMatch.text || '',
              };
              broadcastState.cached_songs[msg.id] = song;
            }
          }
          ws.send(JSON.stringify({
            type: 'song_data',
            data: song || null,
            id: msg.id,
          }));
          break;
        }

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        default:
          console.log(`⚠️ Messaggio sconosciuto: ${msg.type}`);
      }
    } catch (e) {
      console.error('❌ Errore parsing messaggio:', e.message);
    }
  });

  ws.on('close', () => {
    clientCount--;
    console.log(`👋 WS Client disconnesso: ${clientIP} (${clientCount} rimasti)`);
  });

  ws.on('error', (err) => {
    console.error('❌ Errore WebSocket:', err.message);
  });
});

// ═══════════════════════════════════════
// Startup
// ═══════════════════════════════════════
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}

httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  const hasPublic = fs.existsSync(path.join(PUBLIC_DIR, 'index.html'));
  const songbookCount = fs.existsSync(SONGBOOK_DIR) 
    ? fs.readdirSync(SONGBOOK_DIR).filter(f => f.endsWith('.cho')).length : 0;
  const catalogCount = fs.existsSync(CATALOG_FILE) 
    ? JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8')).length : 0;

  console.log('');
  console.log('  ╔════════════════════════════════════════════════╗');
  console.log('  ║   🎵 NonceDuo Local Server                    ║');
  console.log('  ╚════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  HTTP Server:     porta ${HTTP_PORT}`);
  console.log(`  WebSocket:       porta ${WS_PORT}`);
  console.log(`  📚 SongBook:     ${songbookCount} file .cho`);
  console.log(`  📋 Catalogo:     ${catalogCount} brani`);
  console.log('');

  if (!hasPublic) {
    console.log('  ⚠️  ATTENZIONE: cartella "public" vuota o mancante!');
    console.log('  Per servire l\'app in locale devi:');
    console.log('  1. Scaricare il progetto da Lovable (Download)');
    console.log('  2. Estrarre i file');
    console.log('  3. Aprire terminale nella cartella estratta');
    console.log('  4. Eseguire: npm install && npm run build');
    console.log(`  5. Copiare il contenuto di dist\\ dentro: ${PUBLIC_DIR}\\`);
    console.log('');
  }

  if (ips.length > 0) {
    console.log('  📺 Indirizzi per i dispositivi:');
    ips.forEach(({ name, address }) => {
      console.log(`    ➜ http://${address}:${HTTP_PORT}/trasmetti   (TV)`);
      console.log(`    ➜ http://${address}:${HTTP_PORT}/partiture   (Musicisti)`);
      console.log(`    ➜ http://${address}:${HTTP_PORT}/telecomando (Controllo)`);
      console.log(`    ➜ ws://${address}:${WS_PORT}                (WebSocket)`);
      console.log('');
    });
    console.log('  📡 API disponibili:');
    ips.forEach(({ address }) => {
      console.log(`    ➜ http://${address}:${HTTP_PORT}/api/songbook/list`);
      console.log(`    ➜ http://${address}:${HTTP_PORT}/api/catalog/list`);
    });
  } else {
    console.log(`    ➜ http://localhost:${HTTP_PORT}`);
    console.log(`    ➜ ws://localhost:${WS_PORT}`);
  }

  console.log('');
  console.log('  In attesa di connessioni...');
  console.log('');
});
