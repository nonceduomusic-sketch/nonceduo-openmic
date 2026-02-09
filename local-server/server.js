/**
 * NonceDuo Local Broadcast Server
 * 
 * Sincronizza scroll, cambio brano e trasposizione tra dispositivi
 * sulla stessa rete WiFi, senza necessità di internet.
 * 
 * Protocollo WebSocket JSON:
 * 
 * Client → Server:
 *   { type: "update", data: { scroll_position: 500, ... } }
 *   { type: "subscribe" }
 * 
 * Server → Client:
 *   { type: "state", data: { ...broadcastState } }
 *   { type: "update", data: { scroll_position: 500, ... } }
 */

const { WebSocketServer } = require('ws');
const os = require('os');

const PORT = 3456;

// Current broadcast state (mirrors broadcast_sessions fields)
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
  // Cached song content for serving to TV/partiture
  cached_songs: {},
};

// Get local IP addresses
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

// Create WebSocket server
const wss = new WebSocketServer({ port: PORT });

let clientCount = 0;

wss.on('connection', (ws, req) => {
  clientCount++;
  const clientIP = req.socket.remoteAddress;
  console.log(`✅ Client connesso: ${clientIP} (${clientCount} totali)`);

  // Send current state immediately
  ws.send(JSON.stringify({ type: 'state', data: broadcastState }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'update': {
          // Merge partial update into state
          const updates = msg.data || {};
          Object.assign(broadcastState, updates);

          // Broadcast to all OTHER clients
          const outMsg = JSON.stringify({ type: 'update', data: updates });
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === 1) {
              client.send(outMsg);
            }
          });
          break;
        }

        case 'cache_song': {
          // Client sends a song's content for offline serving
          const { id, title, artist, content } = msg.data || {};
          if (id && content) {
            broadcastState.cached_songs[id] = { id, title, artist, content };
            console.log(`📝 Canzone cachata: ${title || id}`);
          }
          break;
        }

        case 'get_song': {
          // Client requests a cached song
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
    console.log(`👋 Client disconnesso: ${clientIP} (${clientCount} rimasti)`);
  });

  ws.on('error', (err) => {
    console.error('❌ Errore WebSocket:', err.message);
  });
});

// Startup message
const ips = getLocalIPs();
console.log('');
console.log('  ╔════════════════════════════════════════════╗');
console.log('  ║   🎵 NonceDuo Local Broadcast Server      ║');
console.log('  ╚════════════════════════════════════════════╝');
console.log('');
console.log(`  Porta: ${PORT}`);
console.log('');
if (ips.length > 0) {
  console.log('  Indirizzi disponibili:');
  ips.forEach(({ name, address }) => {
    console.log(`    ➜ ws://${address}:${PORT}  (${name})`);
  });
} else {
  console.log('  ⚠️ Nessuna interfaccia di rete trovata');
  console.log(`    ➜ ws://localhost:${PORT}`);
}
console.log('');
console.log('  Inserisci questo indirizzo IP nell\'app');
console.log('  (SongBook Live → ⚙️ → Modalità Locale)');
console.log('');
console.log('  In attesa di connessioni...');
console.log('');
