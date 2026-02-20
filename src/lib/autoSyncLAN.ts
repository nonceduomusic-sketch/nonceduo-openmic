/**
 * Auto-sync helper: pushes latest data to the LAN mini-server
 * after any Cloud update (upload, import, edit, delete).
 *
 * Optimizations:
 * - Debounce: rapid successive calls are coalesced (500ms window)
 * - Retry: one automatic retry on transient failure
 * - Non-blocking: runs entirely in background via dynamic imports
 */
import { safeGetItem } from '@/lib/safeStorage';

/** Pending debounce timers keyed by scope */
const pendingTimers: Record<string, ReturnType<typeof setTimeout>> = {};
/** Tracks in-flight sync to avoid duplicate parallel runs */
const inFlight: Record<string, boolean> = {};

const DEBOUNCE_MS = 500;

/** Public entry-point — debounced + deduped */
export function autoSyncToLAN(scope: 'all' | 'catalog' | 'songbook' = 'all') {
  // Clear any existing timer for this scope (coalesce rapid calls)
  if (pendingTimers[scope]) {
    clearTimeout(pendingTimers[scope]);
  }

  pendingTimers[scope] = setTimeout(() => {
    delete pendingTimers[scope];
    runSync(scope);
  }, DEBOUNCE_MS);
}

/** Internal: perform the actual sync with retry */
async function runSync(scope: string, attempt = 1) {
  // Skip if a sync for the same scope is already running
  if (inFlight[scope]) return;

  const localIP = safeGetItem('local', 'broadcast_local_ip') || '';
  if (!localIP) return;

  // Quick reachability check
  try {
    const ping = await fetch(`http://${localIP}:8080/api/ping`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!ping.ok) return;
  } catch {
    return; // Server not reachable, skip silently
  }

  inFlight[scope] = true;

  try {
    const { supabase } = await import('@/integrations/supabase/client');

    if (scope === 'all' || scope === 'catalog') {
      const { syncCatalogToLocalServer } = await import('@/lib/songsCatalogCache');
      const r = await syncCatalogToLocalServer(localIP, supabase);
      if (r.success) console.log(`[AutoSync] Catalogo → LAN: ${r.count} brani`);
      else throw new Error('catalog sync failed');
    }
    if (scope === 'all' || scope === 'songbook') {
      const { syncSongbookToLocalServer } = await import('@/lib/songbookCache');
      const r = await syncSongbookToLocalServer(localIP, supabase);
      if (r.success) console.log(`[AutoSync] SongBook → LAN: ${r.count} file`);
      else throw new Error('songbook sync failed');
    }
  } catch (e) {
    // Retry once after 2s on failure
    if (attempt < 2) {
      console.warn(`[AutoSync] Attempt ${attempt} failed, retrying in 2s…`, e);
      inFlight[scope] = false;
      setTimeout(() => runSync(scope, attempt + 1), 2000);
      return;
    }
    console.warn('[AutoSync] Sync failed after retry:', e);
  } finally {
    inFlight[scope] = false;
  }
}
