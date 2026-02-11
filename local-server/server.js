/**
 * NonceDuo Local Broadcast Server
 * 
 * 1. HTTP Server (porta 8080) — serve i file dell'app (SPA con fallback a index.html)
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
};

// ═══════════════════════════════════════
// HTTP Server — SPA con fallback
// ═══════════════════════════════════════
const httpServer = http.createServer((req, res) => {
  // Remove query string
  const urlPath = req.url.split('?')[0];
  
  // Try to serve the file directly
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
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // SPA Fallback: serve index.html for any route (React Router handles it)
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
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
  cached_songs: {},
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
          const song = broadcastState.cached_songs[msg.id];
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

  console.log('');
  console.log('  ╔════════════════════════════════════════════════╗');
  console.log('  ║   🎵 NonceDuo Local Server                    ║');
  console.log('  ╚════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  HTTP Server:     porta ${HTTP_PORT}`);
  console.log(`  WebSocket:       porta ${WS_PORT}`);
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
  } else {
    console.log(`    ➜ http://localhost:${HTTP_PORT}`);
    console.log(`    ➜ ws://localhost:${WS_PORT}`);
  }

  console.log('  In attesa di connessioni...');
  console.log('');
});
