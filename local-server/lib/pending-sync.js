/**
 * Pending cloud-sync queue.
 *
 * When a Staff user is logged in offline (local cache), cloud writes (settings,
 * permissions, audit log) are enqueued here and flushed when Internet returns.
 * Each entry has a stable idempotency key to prevent double execution.
 */
const fs = require('fs');
const crypto = require('crypto');

function readJsonSafe(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.warn('⚠️  pending-sync.json corrotto:', e.message);
  }
  return fallback;
}

function writeJsonSafe(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function makePendingQueue({ queueFile }) {
  function loadAll() {
    return readJsonSafe(queueFile, []);
  }
  function saveAll(list) {
    writeJsonSafe(queueFile, list);
  }
  function enqueue({ kind, payload, idempotency_key, actor_email }) {
    const list = loadAll();
    const key = idempotency_key || crypto.randomBytes(12).toString('hex');
    if (list.some((e) => e.idempotency_key === key)) {
      return { ok: true, deduped: true, idempotency_key: key };
    }
    list.push({
      idempotency_key: key,
      kind: kind || 'generic',
      payload,
      actor_email: actor_email || null,
      queued_at: new Date().toISOString(),
      attempts: 0,
      last_error: null,
    });
    saveAll(list);
    return { ok: true, idempotency_key: key, queued: list.length };
  }
  function list() { return loadAll(); }
  function remove(idempotency_key) {
    const list = loadAll().filter((e) => e.idempotency_key !== idempotency_key);
    saveAll(list);
  }
  function markAttempt(idempotency_key, error) {
    const all = loadAll();
    const idx = all.findIndex((e) => e.idempotency_key === idempotency_key);
    if (idx >= 0) {
      all[idx].attempts = (all[idx].attempts || 0) + 1;
      all[idx].last_error = error || null;
      all[idx].last_attempt_at = new Date().toISOString();
      saveAll(all);
    }
  }
  function clear() { saveAll([]); }
  function count() { return loadAll().length; }
  return { enqueue, list, remove, markAttempt, clear, count };
}

module.exports = { makePendingQueue };
