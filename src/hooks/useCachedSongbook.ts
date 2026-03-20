/**
 * Hook that wraps useSongbookFiles with an IndexedDB cache layer.
 * Fallback chain: Cloud → LAN mini-server → IndexedDB cache.
 * - On mount: serves cached files instantly, then fetches fresh data.
 * - Pre-caches setlist songs for offline resilience.
 * - Falls back to LAN server, then cache when network fails.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSongbookFiles, type SongbookFile } from '@/hooks/useSongbook';
import {
  cacheSongbookFiles,
  getCachedFiles,
  getAllCachedFiles,
  setLastFullSync,
  getCacheStats,
} from '@/lib/songbookCache';
import { getPreferredLocalServerHost } from '@/lib/localServerHost';
import { toast } from 'sonner';

/** Try fetching songbook files from the LAN mini-server */
async function fetchSongbookFromLAN(): Promise<SongbookFile[]> {
  const localIP = getPreferredLocalServerHost();
  if (!localIP) return [];
  try {
    const resp = await fetch(`http://${localIP}:8080/api/songbook/all`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!Array.isArray(data)) return [];
    return data.map((f: any) => ({
      id: f.id || f.slug || f.filename,
      title: f.title || '',
      artist: f.artist || null,
      content: f.content || '',
      filename: f.filename || '',
      slug: f.slug || null,
      is_variant: f.is_variant || false,
      created_at: '',
      updated_at: '',
      created_by: null,
    }));
  } catch {
    return [];
  }
}

export function useCachedSongbookFiles() {
  const network = useSongbookFiles();
  const [cachedFiles, setCachedFiles] = useState<SongbookFile[]>([]);
  const [lanFiles, setLanFiles] = useState<SongbookFile[]>([]);
  const [cacheReady, setCacheReady] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ count: number; lastSync: number | null }>({ count: 0, lastSync: null });
  const hasHydratedFromCache = useRef(false);

  // 1) Hydrate from IndexedDB immediately
  useEffect(() => {
    if (hasHydratedFromCache.current) return;
    hasHydratedFromCache.current = true;

    getAllCachedFiles().then((cached) => {
      if (cached.length > 0) {
        setCachedFiles(cached.map(c => ({
          id: c.id,
          title: c.title,
          artist: c.artist,
          content: c.content,
          filename: c.filename,
          slug: c.slug,
          is_variant: c.is_variant,
          created_at: '',
          updated_at: '',
          created_by: null,
        })));
      }
      setCacheReady(true);
    });

    getCacheStats().then(setCacheStats);
  }, []);

  // 2) When network data arrives, update cache
  useEffect(() => {
    if (network.files.length > 0) {
      cacheSongbookFiles(network.files).then(() => {
        setLastFullSync();
        getCacheStats().then(setCacheStats);
      });
    }
  }, [network.files]);

  // 3) When cloud has no data and cache is ready, try LAN server
  useEffect(() => {
    if (network.files.length === 0 && !network.loading && cacheReady) {
      console.log('[SongbookCache] Cloud empty, trying LAN server...');
      fetchSongbookFromLAN().then((files) => {
        if (files.length > 0) {
          console.log(`[SongbookCache] LAN server returned ${files.length} files`);
          setLanFiles(files);
          // Also update IndexedDB with LAN data
          cacheSongbookFiles(files).catch(() => {});
        }
      });
    }
  }, [network.files.length, network.loading, cacheReady]);

  // Priority: cloud > LAN > IndexedDB cache
  const files = network.files.length > 0
    ? network.files
    : lanFiles.length > 0
      ? lanFiles
      : cachedFiles;

  const preCacheFileIds = useCallback(async (fileIds: string[]) => {
    const filesToCache = network.files.filter(f => fileIds.includes(f.id));
    if (filesToCache.length > 0) {
      await cacheSongbookFiles(filesToCache);
      const stats = await getCacheStats();
      setCacheStats(stats);
    }
  }, [network.files]);

  return {
    files,
    loading: network.loading && !cacheReady,
    uploadFiles: network.uploadFiles,
    updateFile: network.updateFile,
    deleteFile: network.deleteFile,
    deleteAllFiles: network.deleteAllFiles,
    refetch: network.refetch,
    // Cache-specific
    cacheStats,
    preCacheFileIds,
    isFromCache: network.files.length === 0 && lanFiles.length === 0 && cachedFiles.length > 0,
    isFromLAN: network.files.length === 0 && lanFiles.length > 0,
  };
}
