/**
 * Staff offline auth cache.
 *
 * Stores PBKDF2 hashes of Staff (admin/owner/...) Supabase passwords so that
 * /admin can authenticate without Internet, using the same email/password the
 * user already knows. Also handles signed local tokens (HMAC) and the optional
 * STAFF_MASTER_PIN emergency bypass.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PBKDF2_ITER = 100_000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = 'sha256';
const SALT_BYTES = 16;
const DEFAULT_TTL_DAYS = 30;
const DEFAULT_TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12h

function chmod600Safe(filePath) {
  try { fs.chmodSync(filePath, 0o600); } catch { /* windows or unsupported */ }
}

function readJsonSafe(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.warn(`⚠️  ${path.basename(filePath)} corrotto:`, e.message);
  }
  return fallback;
}

function writeJsonSafe(filePath, data, restrictPerms = false) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  if (restrictPerms) chmod600Safe(filePath);
}

function hashPassword(password, salt) {
  const buf = crypto.pbkdf2Sync(password, salt, PBKDF2_ITER, PBKDF2_KEYLEN, PBKDF2_DIGEST);
  return buf.toString('hex');
}

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function makeStaffCache({ cacheFile, logFile, ttlDays, tokenSecret, tokenTtlMs }) {
  const TTL_MS = (Number(ttlDays) || DEFAULT_TTL_DAYS) * 24 * 60 * 60 * 1000;
  const TOKEN_TTL = Number(tokenTtlMs) || DEFAULT_TOKEN_TTL_MS;

  function loadAll() {
    return readJsonSafe(cacheFile, {});
  }

  function saveAll(map) {
    writeJsonSafe(cacheFile, map, true);
  }

  function normEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function listEmails() {
    return Object.keys(loadAll());
  }

  function getEntry(email) {
    return loadAll()[normEmail(email)] || null;
  }

  function isExpired(entry) {
    if (!entry?.expires_at) return true;
    return new Date(entry.expires_at).getTime() < Date.now();
  }

  function upsertEntry({ email, password, role, username }) {
    const map = loadAll();
    const key = normEmail(email);
    const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
    const pwd_hash = hashPassword(password, salt);
    const now = new Date();
    map[key] = {
      email: key,
      username: username || key.split('@')[0],
      role: role || null,
      salt,
      pwd_hash,
      iter: PBKDF2_ITER,
      digest: PBKDF2_DIGEST,
      last_online_login: now.toISOString(),
      expires_at: new Date(now.getTime() + TTL_MS).toISOString(),
    };
    saveAll(map);
    return map[key];
  }

  function removeEntry(email) {
    const map = loadAll();
    const key = normEmail(email);
    if (map[key]) {
      delete map[key];
      saveAll(map);
      return true;
    }
    return false;
  }

  function clearAll() {
    saveAll({});
  }

  /**
   * Estende expires_at di tutte le entry a now + TTL_MS, senza re-hash.
   * Non rinnova entry scadute da più di GRACE_MS (default 90 giorni)
   * per evitare di tenere indefinitamente vive credenziali abbandonate.
   */
  function renewAll({ graceMs = 90 * 24 * 60 * 60 * 1000 } = {}) {
    const map = loadAll();
    const now = Date.now();
    const newExp = new Date(now + TTL_MS).toISOString();
    let renewed = 0;
    let skipped = 0;
    for (const key of Object.keys(map)) {
      const entry = map[key];
      const exp = entry?.expires_at ? new Date(entry.expires_at).getTime() : 0;
      // Skip entry scadute da troppo tempo
      if (exp > 0 && now - exp > graceMs) {
        skipped++;
        continue;
      }
      entry.expires_at = newExp;
      renewed++;
    }
    saveAll(map);
    return { renewed, skipped, total: Object.keys(map).length, new_expires_at: newExp };
  }

  function verify({ email, password }) {
    const entry = getEntry(email);
    if (!entry) return { ok: false, reason: 'no_cache' };
    if (isExpired(entry)) return { ok: false, reason: 'expired' };
    const computed = hashPassword(password, entry.salt);
    if (!constantTimeEqual(computed, entry.pwd_hash)) {
      return { ok: false, reason: 'bad_password' };
    }
    return { ok: true, entry };
  }

  // ─── Token (HMAC-SHA256) ───
  function signToken(payload) {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto
      .createHmac('sha256', tokenSecret)
      .update(body)
      .digest('base64url');
    return `${body}.${sig}`;
  }

  function verifyToken(token) {
    if (typeof token !== 'string' || !token.includes('.')) return null;
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const expected = crypto
      .createHmac('sha256', tokenSecret)
      .update(body)
      .digest('base64url');
    if (!constantTimeEqual(sig, expected)) return null;
    try {
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
      if (!payload?.exp || payload.exp < Date.now()) return null;
      return payload;
    } catch {
      return null;
    }
  }

  function issueToken({ email, role, source }) {
    return signToken({
      email: normEmail(email),
      role,
      source: source || 'cache',
      iat: Date.now(),
      exp: Date.now() + TOKEN_TTL,
    });
  }

  // ─── Offline session log ───
  function appendLog(entry) {
    if (!logFile) return;
    try {
      const list = readJsonSafe(logFile, []);
      list.push({ ...entry, ts: new Date().toISOString() });
      // Keep last 500
      const trimmed = list.slice(-500);
      writeJsonSafe(logFile, trimmed);
    } catch (e) {
      console.warn('⚠️  staff-offline-log write failed:', e.message);
    }
  }

  return {
    listEmails,
    getEntry,
    upsertEntry,
    removeEntry,
    clearAll,
    renewAll,
    verify,
    issueToken,
    verifyToken,
    appendLog,
    isExpired,
  };
}

// ─── Rate limiting (in-memory) ───
function makeRateLimiter({ windowMs = 15 * 60 * 1000, maxAttempts = 5 } = {}) {
  const buckets = new Map(); // key -> [timestamps]
  return {
    check(key) {
      const now = Date.now();
      const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
      if (arr.length >= maxAttempts) {
        buckets.set(key, arr);
        return { allowed: false, retryAfterMs: windowMs - (now - arr[0]) };
      }
      arr.push(now);
      buckets.set(key, arr);
      return { allowed: true };
    },
    reset(key) { buckets.delete(key); },
  };
}

module.exports = {
  makeStaffCache,
  makeRateLimiter,
  constantTimeEqual,
};
