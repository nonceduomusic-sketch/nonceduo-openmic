/**
 * Hook that wraps useSongbookFiles with an IndexedDB cache layer.
 * - On mount: serves cached files instantly, then fetches fresh data.
 * - Pre-caches setlist songs for offline resilience.
 * - Falls back to cache when network fails.
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
import { toast } from 'sonner';

export function useCachedSongbookFiles() {
  const network = useSongbookFiles();
  const [cachedFiles, setCachedFiles] = useState<SongbookFile[]>([]);
  const [cacheReady, setCacheReady] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ count: number; lastSync: number | null }>({ count: 0, lastSync: null });
  const hasHydratedFromCache = useRef(false);

  // 1) Hydrate from IndexedDB immediately
  useEffect(() => {
    if (hasHydratedFromCache.current) return;
    hasHydratedFromCache.current = true;

    getAllCachedFiles().then((cached) => {
      if (cached.length > 0) {
        // Serve cached data instantly (cast to SongbookFile shape)
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
      // Update IndexedDB in background
      cacheSongbookFiles(network.files).then(() => {
        setLastFullSync();
        getCacheStats().then(setCacheStats);
      });
    }
  }, [network.files]);

  // Use network files when available, fall back to cache
  const files = network.files.length > 0 ? network.files : cachedFiles;

  // Pre-cache specific file IDs (e.g., all songs in a setlist)
  const preCacheFileIds = useCallback(async (fileIds: string[]) => {
    // Filter to only IDs that exist in network data
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
    isFromCache: network.files.length === 0 && cachedFiles.length > 0,
  };
}
