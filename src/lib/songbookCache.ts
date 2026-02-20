/**
 * IndexedDB cache for SongBook files.
 * Pre-loads setlist songs so they're available instantly,
 * even with slow or intermittent connectivity.
 */
import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'songbook-cache';
const DB_VERSION = 1;
const STORE_FILES = 'files';
const STORE_META = 'meta';

interface CachedSongbookFile {
  id: string;
  title: string;
  artist: string | null;
  content: string;
  filename: string;
  slug: string | null;
  is_variant: boolean;
  last_transpose?: number;
  cached_at: number; // timestamp
}

interface CacheMeta {
  key: string;
  value: string | number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_FILES)) {
          db.createObjectStore(STORE_FILES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

/** Cache a single songbook file */
export async function cacheSongbookFile(file: {
  id: string;
  title: string;
  artist: string | null;
  content: string;
  filename: string;
  slug: string | null;
  is_variant: boolean;
  last_transpose?: number;
}): Promise<void> {
  try {
    const db = await getDB();
    const cached: CachedSongbookFile = {
      ...file,
      cached_at: Date.now(),
    };
    await db.put(STORE_FILES, cached);
  } catch (e) {
    console.warn('[SongbookCache] Failed to cache file:', e);
  }
}

/** Cache multiple files at once */
export async function cacheSongbookFiles(files: Array<{
  id: string;
  title: string;
  artist: string | null;
  content: string;
  filename: string;
  slug: string | null;
  is_variant: boolean;
  last_transpose?: number;
}>): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_FILES, 'readwrite');
    const now = Date.now();
    for (const file of files) {
      tx.store.put({ ...file, cached_at: now });
    }
    await tx.done;
  } catch (e) {
    console.warn('[SongbookCache] Failed to cache files:', e);
  }
}

/** Get a single cached file by ID */
export async function getCachedFile(id: string): Promise<CachedSongbookFile | undefined> {
  try {
    const db = await getDB();
    return await db.get(STORE_FILES, id);
  } catch (e) {
    console.warn('[SongbookCache] Failed to get cached file:', e);
    return undefined;
  }
}

/** Get multiple cached files by IDs */
export async function getCachedFiles(ids: string[]): Promise<CachedSongbookFile[]> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_FILES, 'readonly');
    const results: CachedSongbookFile[] = [];
    for (const id of ids) {
      const file = await tx.store.get(id);
      if (file) results.push(file);
    }
    await tx.done;
    return results;
  } catch (e) {
    console.warn('[SongbookCache] Failed to get cached files:', e);
    return [];
  }
}

/** Get all cached files */
export async function getAllCachedFiles(): Promise<CachedSongbookFile[]> {
  try {
    const db = await getDB();
    return await db.getAll(STORE_FILES);
  } catch (e) {
    console.warn('[SongbookCache] Failed to get all cached files:', e);
    return [];
  }
}

/** Remove a cached file */
export async function removeCachedFile(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE_FILES, id);
  } catch (e) {
    console.warn('[SongbookCache] Failed to remove cached file:', e);
  }
}

/** Clear entire cache */
export async function clearSongbookCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(STORE_FILES);
    await db.clear(STORE_META);
  } catch (e) {
    console.warn('[SongbookCache] Failed to clear cache:', e);
  }
}

/** Get cache stats */
export async function getCacheStats(): Promise<{ count: number; lastSync: number | null }> {
  try {
    const db = await getDB();
    const count = await db.count(STORE_FILES);
    const meta = await db.get(STORE_META, 'lastFullSync');
    return { count, lastSync: meta?.value as number | null ?? null };
  } catch (e) {
    return { count: 0, lastSync: null };
  }
}

/** Mark a full sync timestamp */
export async function setLastFullSync(): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE_META, { key: 'lastFullSync', value: Date.now() });
  } catch (e) {
    // ignore
  }
}

/** Download ALL songbook files from Supabase and cache them for offline use */
export async function downloadAllSongbookFilesForOffline(
  supabaseClient: { from: (table: string) => any }
): Promise<{ success: boolean; count: number }> {
  try {
    const allFiles: CachedSongbookFile[] = [];
    const pageSize = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabaseClient
        .from('songbook_files')
        .select('id, title, artist, content, filename, slug, is_variant')
        .range(from, from + pageSize - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allFiles.push(...data);
        from += pageSize;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    if (allFiles.length > 0) {
      const db = await getDB();
      const tx = db.transaction(STORE_FILES, 'readwrite');
      const now = Date.now();
      await tx.store.clear();
      for (const file of allFiles) {
        tx.store.put({ ...file, cached_at: now });
      }
      await tx.done;
      await setLastFullSync();
    }

    return { success: true, count: allFiles.length };
  } catch (e) {
    console.error('[SongbookCache] Failed to download all files:', e);
    return { success: false, count: 0 };
  }
}
