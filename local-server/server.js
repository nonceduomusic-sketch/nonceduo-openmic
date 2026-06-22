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
const crypto = require('crypto');
const { makeStaffCache, makeRateLimiter } = require('./lib/staff-cache');
const { makePendingQueue } = require('./lib/pending-sync');

const HTTP_PORT = 8080;
const WS_PORT = 3456;

// Directory contenente la build dell'app (npm run build → dist/)
const PUBLIC_DIR = path.join(__dirname, 'public');

// Directory per i dati locali (catalogo e songbook)
const DATA_DIR = path.join(__dirname, 'data');
const SONGBOOK_DIR = path.join(DATA_DIR, 'songbook');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');
const SONGBOOK_IDS_FILE = path.join(DATA_DIR, 'songbook-ids.json');
const PIN_CACHE_FILE = path.join(DATA_DIR, 'pin-cache.json');
const LOCAL_SESSIONS_FILE = path.join(DATA_DIR, 'local-sessions.json');
const STAFF_CACHE_FILE = path.join(DATA_DIR, 'staff-cache.json');
const STAFF_LOG_FILE = path.join(DATA_DIR, 'staff-offline-log.json');
const PENDING_SYNC_FILE = path.join(DATA_DIR, 'pending-sync.json');
const ENV_FILE = path.join(__dirname, '.env');


// ═══════════════════════════════════════
// .env loader (no dotenv dependency)
// ═══════════════════════════════════════
function loadEnv() {
  const env = {};
  try {
    if (fs.existsSync(ENV_FILE)) {
      const lines = fs.readFileSync(ENV_FILE, 'utf-8').split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        // Strip surrounding quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    }
  } catch (e) {
    console.warn('⚠️  Errore lettura .env:', e.message);
  }
  return env;
}
const LOCAL_ENV = loadEnv();
const EMERGENCY_PIN = (LOCAL_ENV.EMERGENCY_PIN || process.env.EMERGENCY_PIN || '').trim().toUpperCase();
const LOCAL_SESSION_TTL_MS = Number(LOCAL_ENV.LOCAL_SESSION_TTL_MS || process.env.LOCAL_SESSION_TTL_MS || 24 * 60 * 60 * 1000);
if (EMERGENCY_PIN) {
  console.log(`🚨 PIN di emergenza (formati) ATTIVO`);
} else {
  console.log(`ℹ️  PIN di emergenza (formati) disabilitato`);
}

// ─── Staff offline auth config ───
const STAFF_CACHE_TTL_DAYS = Number(LOCAL_ENV.STAFF_CACHE_TTL_DAYS || 30);
const STAFF_LOCAL_TOKEN_TTL_MS = Number(LOCAL_ENV.STAFF_LOCAL_TOKEN_TTL_MS || 12 * 60 * 60 * 1000);
const STAFF_MASTER_PIN = (LOCAL_ENV.STAFF_MASTER_PIN || '').trim().toUpperCase();
const STAFF_MASTER_PIN_ROLE = (LOCAL_ENV.STAFF_MASTER_PIN_ROLE || 'admin').trim().toLowerCase();
const STAFF_CACHE_ALLOWED_EMAILS = (LOCAL_ENV.STAFF_CACHE_ALLOWED_EMAILS || '')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

// Auto-generate STAFF_LOCAL_TOKEN_SECRET if missing
let STAFF_LOCAL_TOKEN_SECRET = (LOCAL_ENV.STAFF_LOCAL_TOKEN_SECRET || '').trim();
if (!STAFF_LOCAL_TOKEN_SECRET) {
  STAFF_LOCAL_TOKEN_SECRET = crypto.randomBytes(32).toString('hex');
  try {
    const line = `\nSTAFF_LOCAL_TOKEN_SECRET=${STAFF_LOCAL_TOKEN_SECRET}\n`;
    fs.appendFileSync(ENV_FILE, line);
    console.log('🔑 STAFF_LOCAL_TOKEN_SECRET generato e salvato in .env');
  } catch (e) {
    console.warn('⚠️  Impossibile scrivere STAFF_LOCAL_TOKEN_SECRET in .env:', e.message);
    console.warn('    Il segreto verrà rigenerato ad ogni riavvio (le sessioni Staff locali non sopravvivono ai restart).');
  }
}

// Assicura che le cartelle dati esistano (serve PRIMA di creare staff cache)
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SONGBOOK_DIR)) fs.mkdirSync(SONGBOOK_DIR, { recursive: true });

const staffCache = makeStaffCache({
  cacheFile: STAFF_CACHE_FILE,
  logFile: STAFF_LOG_FILE,
  ttlDays: STAFF_CACHE_TTL_DAYS,
  tokenSecret: STAFF_LOCAL_TOKEN_SECRET,
  tokenTtlMs: STAFF_LOCAL_TOKEN_TTL_MS,
});
const pendingQueue = makePendingQueue({ queueFile: PENDING_SYNC_FILE });
const staffRateLimit = makeRateLimiter({ windowMs: 15 * 60 * 1000, maxAttempts: 5 });

if (STAFF_MASTER_PIN) {
  console.log(`🆘 STAFF_MASTER_PIN ATTIVO (ruolo: ${STAFF_MASTER_PIN_ROLE}) — solo emergenza`);
} else {
  console.log(`ℹ️  STAFF_MASTER_PIN disabilitato`);
}
console.log(`👥 Staff cache: ${staffCache.listEmails().length} utenti memorizzati`);


function getFileMTimeISO(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return new Date(fs.statSync(filePath).mtimeMs).toISOString();
  } catch {
    return null;
  }
}

function getLocalBuildInfo() {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  const assetsDir = path.join(PUBLIC_DIR, 'assets');
  let latestAssetUpdatedAt = null;
  let assetCount = 0;

  try {
    if (fs.existsSync(assetsDir)) {
      const files = fs.readdirSync(assetsDir).map((name) => path.join(assetsDir, name));
      assetCount = files.length;
      const latest = files
        .filter((file) => fs.existsSync(file) && fs.statSync(file).isFile())
        .map((file) => fs.statSync(file).mtimeMs)
        .sort((a, b) => b - a)[0];

      if (latest) latestAssetUpdatedAt = new Date(latest).toISOString();
    }
  } catch {}

  return {
    server_updated_at: getFileMTimeISO(__filename),
    public_dir_exists: fs.existsSync(PUBLIC_DIR),
    public_index_exists: fs.existsSync(indexPath),
    public_index_updated_at: getFileMTimeISO(indexPath),
    public_assets_count: assetCount,
    latest_asset_updated_at: latestAssetUpdatedAt,
  };
}

// (cartelle data/ già create sopra)


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
// PIN cache + Local sessions (offline auth)
// ═══════════════════════════════════════
function loadPinCache() {
  try {
    if (fs.existsSync(PIN_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(PIN_CACHE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('⚠️  pin-cache.json corrotto:', e.message);
  }
  return null;
}

function savePinCache(meta) {
  try {
    const prev = loadPinCache() || {};
    const merged = { ...prev, ...meta };
    fs.writeFileSync(PIN_CACHE_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    if (meta.pin_code) {
      console.log(`🔐 PIN sincronizzato e salvato in pin-cache.json (formati: ${(meta.protected_formats || []).join(', ') || 'tutti'})`);
    }
  } catch (e) {
    console.warn('⚠️  Errore scrittura pin-cache.json:', e.message);
  }
}

function loadLocalSessions() {
  try {
    if (fs.existsSync(LOCAL_SESSIONS_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_SESSIONS_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function persistLocalSessions(map) {
  try {
    fs.writeFileSync(LOCAL_SESSIONS_FILE, JSON.stringify(map, null, 2), 'utf-8');
  } catch (e) {
    console.warn('⚠️  Errore scrittura local-sessions.json:', e.message);
  }
}

// Garbage-collect expired sessions periodically
function gcLocalSessions() {
  const map = loadLocalSessions();
  const now = Date.now();
  let removed = 0;
  for (const k of Object.keys(map)) {
    if (!map[k]?.expires_at || new Date(map[k].expires_at).getTime() < now) {
      delete map[k];
      removed++;
    }
  }
  if (removed > 0) persistLocalSessions(map);
}
setInterval(gcLocalSessions, 60 * 60 * 1000); // every hour

function saveLocalSession(session) {
  const map = loadLocalSessions();
  map[session.token] = session;
  persistLocalSessions(map);
}

function getLocalSession(token) {
  if (!token) return null;
  const map = loadLocalSessions();
  return map[token] || null;
}

function removeLocalSession(token) {
  const map = loadLocalSessions();
  if (map[token]) {
    delete map[token];
    persistLocalSessions(map);
  }
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

  if (urlPath === '/api/version' && req.method === 'GET') {
    return sendJSON(res, {
      ok: true,
      ...getLocalBuildInfo(),
    });
  }

  // Sync PIN display state for local /trasmetti pages
  // Also persists PIN to disk so it survives restarts WITHOUT internet
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

      // Extra fields (optional, used by offline PIN validation)
      const pinMeta = {
        pin_code: updates.pin_code,
        pin_required: updates.pin_required,
        live_session_id: typeof body.live_session_id === 'string' ? body.live_session_id : null,
        protected_formats: Array.isArray(body.protected_formats) ? body.protected_formats : [],
        expires_at: typeof body.expires_at === 'string' ? body.expires_at : null,
        synced_at: new Date().toISOString(),
      };

      Object.assign(broadcastState, updates);
      savePinCache(pinMeta);

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

  // ── OFFLINE PIN STATUS (verifica esplicita) ──
  // Espone se il PIN è realmente persistito in pin-cache.json,
  // senza rivelare il PIN completo. Utile per verificare prima di
  // andare offline che la sincronizzazione sia avvenuta.
  if (urlPath === '/api/pin-status' && req.method === 'GET') {
    const cache = loadPinCache();
    const hasPin = !!(cache && cache.pin_code);
    const pin = cache?.pin_code || '';
    return sendJSON(res, {
      ok: true,
      has_cached_pin: hasPin,
      pin_last2: hasPin ? pin.slice(-2) : null,
      pin_length: hasPin ? pin.length : 0,
      protected_formats: cache?.protected_formats || [],
      live_session_id: cache?.live_session_id || null,
      synced_at: cache?.synced_at || null,
      cache_file: PIN_CACHE_FILE,
      emergency_pin_enabled: !!EMERGENCY_PIN,
      active_local_sessions: loadLocalSessions().length,
    });
  }

  // ── OFFLINE PIN AUTHENTICATION ──
  // Validate a PIN against the locally cached value (or the emergency PIN).
  // Returns a token usable while offline.

  if (urlPath === '/api/pin-validate' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const pin = typeof body.pin === 'string' ? body.pin.trim().toUpperCase() : '';
      const format = typeof body.format === 'string' ? body.format.trim() : '';

      if (!pin || pin.length < 3) {
        return sendJSON(res, { ok: false, error: 'pin_missing' }, 400);
      }

      const cache = loadPinCache();
      let source = null;
      let liveSessionId = cache?.live_session_id || null;
      let protectedFormats = cache?.protected_formats || [];
      let expiresAt = cache?.expires_at || null;

      // 1) Match against cached PIN (synced by admin while online)
      if (cache && cache.pin_code && cache.pin_code === pin) {
        source = 'cache';
      }
      // 2) Fallback: emergency PIN configured in .env
      else if (EMERGENCY_PIN && pin === EMERGENCY_PIN) {
        source = 'emergency';
        liveSessionId = liveSessionId || 'local-emergency';
        // Emergency PIN grants access to all known formats
        if (!protectedFormats.length) {
          protectedFormats = ['openmic', 'dediche', 'furore', 'giochi', 'community'];
        }
      } else {
        return sendJSON(res, { ok: false, error: 'pin_invalid' }, 401);
      }

      // If a format was specified, ensure it's covered (or empty list = all)
      if (format && protectedFormats.length && !protectedFormats.includes(format)) {
        return sendJSON(res, { ok: false, error: 'format_not_protected' }, 403);
      }

      // Issue local token (random hex)
      const token = require('crypto').randomBytes(24).toString('hex');
      const ttl = LOCAL_SESSION_TTL_MS;
      const session = {
        token,
        live_session_id: liveSessionId,
        protected_formats: protectedFormats,
        source,
        created_at: new Date().toISOString(),
        expires_at: expiresAt || new Date(Date.now() + ttl).toISOString(),
      };
      saveLocalSession(session);

      return sendJSON(res, { ok: true, ...session });
    } catch (e) {
      return sendJSON(res, { ok: false, error: 'bad_request' }, 400);
    }
  }

  // Validate an existing local token
  if (urlPath === '/api/pin-session-check' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const token = typeof body.token === 'string' ? body.token : '';
      const format = typeof body.format === 'string' ? body.format : '';

      const session = getLocalSession(token);
      if (!session) {
        return sendJSON(res, { is_valid: false, reason: 'token_invalid' });
      }
      if (new Date(session.expires_at).getTime() < Date.now()) {
        removeLocalSession(token);
        return sendJSON(res, { is_valid: false, reason: 'token_expired' });
      }
      if (format && session.protected_formats?.length && !session.protected_formats.includes(format)) {
        return sendJSON(res, { is_valid: false, reason: 'format_not_allowed' });
      }
      return sendJSON(res, {
        is_valid: true,
        live_session_id: session.live_session_id,
        protected_formats: session.protected_formats,
        expires_at: session.expires_at,
      });
    } catch (e) {
      return sendJSON(res, { is_valid: false, reason: 'bad_request' }, 400);
    }
  }

  // ════════════════════════════════════════════════
  // STAFF OFFLINE AUTH (Fase 1 + Fase 2)
  // ════════════════════════════════════════════════
  function clientKey() {
    return (req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
  }

  // Status pubblico (per UI: capire se cache vuota / master pin attivo / coda pending)
  if (urlPath === '/api/staff/status' && req.method === 'GET') {
    const emails = staffCache.listEmails();
    return sendJSON(res, {
      enabled: true,
      cache_empty: emails.length === 0,
      cached_emails_count: emails.length,
      master_pin_enabled: !!STAFF_MASTER_PIN,
      pending_sync_count: pendingQueue.count(),
    });
  }

  // Cache credenziali Staff (chiamato DOPO login Supabase OK)
  if (urlPath === '/api/staff/cache-credentials' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const role = String(body.role || '').trim().toLowerCase();
      const username = String(body.username || '').trim();

      if (!email || !password || !role) {
        return sendJSON(res, { ok: false, error: 'missing_fields' }, 400);
      }
      if (!['owner', 'admin', 'moderator', 'operator'].includes(role)) {
        return sendJSON(res, { ok: false, error: 'invalid_role' }, 400);
      }
      if (STAFF_CACHE_ALLOWED_EMAILS.length && !STAFF_CACHE_ALLOWED_EMAILS.includes(email)) {
        return sendJSON(res, { ok: false, error: 'email_not_whitelisted' }, 403);
      }
      staffCache.upsertEntry({ email, password, role, username });
      console.log(`👤 Staff cache aggiornata per ${email} (${role})`);
      return sendJSON(res, { ok: true });
    } catch (e) {
      return sendJSON(res, { ok: false, error: 'bad_request' }, 400);
    }
  }

  // Login offline contro la cache locale
  if (urlPath === '/api/staff/validate-offline' && req.method === 'POST') {
    try {
      const rl = staffRateLimit.check(`offline:${clientKey()}`);
      if (!rl.allowed) {
        return sendJSON(res, { ok: false, error: 'rate_limited', retry_after_ms: rl.retryAfterMs }, 429);
      }
      const body = await readBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!email || !password) {
        return sendJSON(res, { ok: false, error: 'missing_fields' }, 400);
      }
      const result = staffCache.verify({ email, password });
      if (!result.ok) {
        staffCache.appendLog({ event: 'login_failed', email, reason: result.reason });
        return sendJSON(res, { ok: false, error: result.reason }, 401);
      }
      const token = staffCache.issueToken({ email, role: result.entry.role, source: 'cache' });
      const exp = new Date(Date.now() + STAFF_LOCAL_TOKEN_TTL_MS).toISOString();
      staffCache.appendLog({ event: 'login_ok', email, role: result.entry.role, source: 'cache' });
      return sendJSON(res, {
        ok: true,
        token,
        email,
        username: result.entry.username,
        role: result.entry.role,
        expires_at: exp,
      });
    } catch (e) {
      return sendJSON(res, { ok: false, error: 'bad_request' }, 400);
    }
  }

  // Login di emergenza tramite STAFF_MASTER_PIN
  if (urlPath === '/api/staff/master-pin-login' && req.method === 'POST') {
    try {
      const rl = staffRateLimit.check(`master:${clientKey()}`);
      if (!rl.allowed) {
        return sendJSON(res, { ok: false, error: 'rate_limited', retry_after_ms: rl.retryAfterMs }, 429);
      }
      if (!STAFF_MASTER_PIN) {
        return sendJSON(res, { ok: false, error: 'master_pin_disabled' }, 403);
      }
      const body = await readBody(req);
      const pin = String(body.pin || '').trim().toUpperCase();
      if (!pin) {
        return sendJSON(res, { ok: false, error: 'missing_pin' }, 400);
      }
      // Confronto a tempo costante
      const a = Buffer.from(pin);
      const b = Buffer.from(STAFF_MASTER_PIN);
      const equal = a.length === b.length && crypto.timingSafeEqual(a, b);
      if (!equal) {
        staffCache.appendLog({ event: 'master_pin_failed' });
        return sendJSON(res, { ok: false, error: 'pin_invalid' }, 401);
      }
      const token = staffCache.issueToken({
        email: 'emergency@local',
        role: STAFF_MASTER_PIN_ROLE,
        source: 'master_pin',
      });
      const exp = new Date(Date.now() + STAFF_LOCAL_TOKEN_TTL_MS).toISOString();
      staffCache.appendLog({ event: 'master_pin_login', role: STAFF_MASTER_PIN_ROLE });
      console.log(`🆘 Accesso Staff EMERGENZA via Master PIN (ruolo: ${STAFF_MASTER_PIN_ROLE})`);
      return sendJSON(res, {
        ok: true,
        token,
        role: STAFF_MASTER_PIN_ROLE,
        expires_at: exp,
      });
    } catch (e) {
      return sendJSON(res, { ok: false, error: 'bad_request' }, 400);
    }
  }

  // Verifica token Staff locale
  if (urlPath === '/api/staff/token-check' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const token = String(body.token || '');
      const payload = staffCache.verifyToken(token);
      if (!payload) return sendJSON(res, { ok: false, error: 'token_invalid' }, 401);
      return sendJSON(res, { ok: true, ...payload });
    } catch (e) {
      return sendJSON(res, { ok: false, error: 'bad_request' }, 400);
    }
  }

  // Svuota intera cache Staff (azione manuale dall'admin)
  if (urlPath === '/api/staff/cache-clear' && req.method === 'POST') {
    staffCache.clearAll();
    staffCache.appendLog({ event: 'cache_cleared' });
    console.log('🧹 Staff cache svuotata');
    return sendJSON(res, { ok: true });
  }

  // Rinnova TTL di tutte le entry in cache (chiamato dallo script di avvio/aggiornamento)
  // Ristretto a localhost: solo il PC server stesso può chiamarlo.
  if (urlPath === '/api/staff/cache-renew' && req.method === 'POST') {
    const ip = (req.socket?.remoteAddress || '').replace('::ffff:', '');
    const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
    if (!isLocal) {
      return sendJSON(res, { ok: false, error: 'localhost_only' }, 403);
    }
    const result = staffCache.renewAll();
    staffCache.appendLog({ event: 'cache_renewed', ...result });
    console.log(`🔄 Staff cache rinnovata: ${result.renewed} attive, ${result.skipped} ignorate (scadute >90gg), nuova scadenza ${result.new_expires_at}`);
    return sendJSON(res, { ok: true, ...result });
  }


  // ── Pending sync queue ──
  if (urlPath === '/api/staff/queue-write' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const out = pendingQueue.enqueue({
        kind: body.kind,
        payload: body.payload,
        idempotency_key: body.idempotency_key,
        actor_email: body.actor_email,
      });
      return sendJSON(res, out);
    } catch {
      return sendJSON(res, { ok: false, error: 'bad_request' }, 400);
    }
  }

  if (urlPath === '/api/staff/pending-sync/list' && req.method === 'GET') {
    return sendJSON(res, pendingQueue.list());
  }

  if (urlPath === '/api/staff/pending-sync/remove' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      pendingQueue.remove(String(body.idempotency_key || ''));
      return sendJSON(res, { ok: true });
    } catch {
      return sendJSON(res, { ok: false, error: 'bad_request' }, 400);
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

// Hydrate PIN state from disk on startup (so offline reboot keeps PIN active)
try {
  const cached = loadPinCache();
  if (cached) {
    if (cached.pin_code) broadcastState.pin_code = cached.pin_code;
    if (typeof cached.pin_required === 'boolean') broadcastState.pin_required = cached.pin_required;
    console.log(`🔐 PIN cache caricata da disco (formati: ${(cached.protected_formats || []).join(', ') || 'tutti'})`);
  }
} catch {}

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
  const buildInfo = getLocalBuildInfo();

  console.log('');
  console.log('  ╔════════════════════════════════════════════════╗');
  console.log('  ║   🎵 NonceDuo Local Server                    ║');
  console.log('  ╚════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  HTTP Server:     porta ${HTTP_PORT}`);
  console.log(`  WebSocket:       porta ${WS_PORT}`);
  console.log(`  📚 SongBook:     ${songbookCount} file .cho`);
  console.log(`  📋 Catalogo:     ${catalogCount} brani`);
  console.log(`  🧩 server.js:    ${buildInfo.server_updated_at || 'n/d'}`);
  console.log(`  🏠 public/:      ${buildInfo.public_index_updated_at || 'mancante'}`);
  console.log(`  📦 assets:       ${buildInfo.public_assets_count} file`);
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
