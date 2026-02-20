/**
 * IndexedDB cache for the songs catalog.
 * Enables offline browsing and broadcasting of catalog songs.
 */
import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'songs-catalog-cache';
const DB_VERSION = 1;
const STORE_SONGS = 'songs';
const STORE_META = 'meta';

export interface CachedSong {
  id: string;
  titolo: string;
  artista: string;
  testo: string | null;
  slug: string | null;
  cached_at: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_SONGS)) {
          const store = db.createObjectStore(STORE_SONGS, { keyPath: 'id' });
          store.createIndex('by_titolo', 'titolo');
          store.createIndex('by_artista', 'artista');
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

/** Cache all songs (replaces existing) */
export async function cacheSongsCatalog(songs: Array<{
  id: string;
  titolo: string;
  artista: string;
  testo: string | null;
  slug: string | null;
}>): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_SONGS, 'readwrite');
    const now = Date.now();
    // Clear old data and insert fresh
    await tx.store.clear();
    for (const song of songs) {
      tx.store.put({ ...song, cached_at: now });
    }
    await tx.done;
    // Update sync timestamp
    const metaTx = db.transaction(STORE_META, 'readwrite');
    await metaTx.store.put({ key: 'lastSync', value: now });
    await metaTx.done;
  } catch (e) {
    console.warn('[SongsCatalogCache] Failed to cache:', e);
  }
}

/** Get all cached songs */
export async function getAllCachedSongs(): Promise<CachedSong[]> {
  try {
    const db = await getDB();
    return await db.getAll(STORE_SONGS);
  } catch (e) {
    console.warn('[SongsCatalogCache] Failed to get cached songs:', e);
    return [];
  }
}

/** Get a single cached song by ID */
export async function getCachedSongById(id: string): Promise<CachedSong | undefined> {
  try {
    const db = await getDB();
    return await db.get(STORE_SONGS, id);
  } catch (e) {
    console.warn('[SongsCatalogCache] Failed to get cached song:', e);
    return undefined;
  }
}

/** Get cache stats */
export async function getSongsCatalogCacheStats(): Promise<{ count: number; lastSync: number | null }> {
  try {
    const db = await getDB();
    const count = await db.count(STORE_SONGS);
    const meta = await db.get(STORE_META, 'lastSync');
    return { count, lastSync: meta?.value as number | null ?? null };
  } catch (e) {
    return { count: 0, lastSync: null };
  }
}

/** Clear the catalog cache */
export async function clearSongsCatalogCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(STORE_SONGS);
    await db.clear(STORE_META);
  } catch (e) {
    console.warn('[SongsCatalogCache] Failed to clear cache:', e);
  }
}
