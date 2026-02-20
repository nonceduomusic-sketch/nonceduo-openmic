/**
 * Auto-sync helper: pushes latest data to the LAN mini-server
 * after any Cloud update (upload, import, edit, delete).
 */
import { safeGetItem } from '@/lib/safeStorage';

/** Check if the LAN server is reachable, then sync both catalog and songbook */
export async function autoSyncToLAN(scope: 'all' | 'catalog' | 'songbook' = 'all') {
  const localIP = safeGetItem('local', 'broadcast_local_ip') || '';
  if (!localIP) return;

  try {
    // Quick reachability check
    const ping = await fetch(`http://${localIP}:8080/api/ping`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!ping.ok) return;
  } catch {
    return; // Server not reachable, skip silently
  }

  const { supabase } = await import('@/integrations/supabase/client');

  try {
    if (scope === 'all' || scope === 'catalog') {
      const { syncCatalogToLocalServer } = await import('@/lib/songsCatalogCache');
      const r = await syncCatalogToLocalServer(localIP, supabase);
      if (r.success) console.log(`[AutoSync] Catalogo → LAN: ${r.count} brani`);
    }
    if (scope === 'all' || scope === 'songbook') {
      const { syncSongbookToLocalServer } = await import('@/lib/songbookCache');
      const r = await syncSongbookToLocalServer(localIP, supabase);
      if (r.success) console.log(`[AutoSync] SongBook → LAN: ${r.count} file`);
    }
  } catch (e) {
    console.warn('[AutoSync] Sync failed:', e);
  }
}
