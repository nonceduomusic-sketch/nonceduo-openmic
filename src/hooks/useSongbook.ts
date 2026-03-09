import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { extractChordProTitle } from '@/lib/chordpro';
import JSZip from 'jszip';

export interface SongbookFile {
  id: string;
  title: string;
  artist: string | null;
  content: string;
  filename: string;
  slug: string | null;
  is_variant: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface SongbookSetlist {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SongbookSetlistSong {
  id: string;
  setlist_id: string;
  songbook_file_id: string;
  position: number;
  notes: string | null;
  created_at: string;
  file?: SongbookFile;
}

export function useSongbookFiles() {
  const [files, setFiles] = useState<SongbookFile[]>([]);
  const [loading, setLoading] = useState(true);

  const hasHydratedFromCache = useRef(false);

  const fetchFiles = useCallback(async () => {
    setLoading(true);

    // 1) Hydrate from IndexedDB immediately (only once)
    if (!hasHydratedFromCache.current) {
      hasHydratedFromCache.current = true;
      try {
        const { getAllCachedFiles } = await import('@/lib/songbookCache');
        const cached = await getAllCachedFiles();
        if (cached.length > 0) {
          const mapped: SongbookFile[] = cached.map(c => ({
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
          })).sort((a, b) => a.title.localeCompare(b.title, 'it'));
          setFiles(mapped);
          setLoading(false);
        }
      } catch {
        // cache miss
      }
    }

    // 2) Fetch from network with timeout
    try {
      const allData: SongbookFile[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;
      let hadNetworkError = false;

      while (hasMore) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const { data, error } = await supabase
          .from('songbook_files')
          .select('*')
          .order('is_variant', { ascending: true })
          .order('title', { ascending: true })
          .range(from, from + pageSize - 1)
          .abortSignal(controller.signal);
        clearTimeout(timeout);

        if (error) {
          console.error('Error fetching songbook files:', error);
          hadNetworkError = true;
          break;
        }

        if (data && data.length > 0) {
          allData.push(...(data as SongbookFile[]));
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      // If fetch succeeded (even with 0 rows), database is the source of truth
      if (!hadNetworkError) {
        setFiles(allData);
        import('@/lib/songbookCache').then(({ cacheSongbookFiles, clearSongbookCache }) => {
          // Always clear first to remove stale entries, then re-populate
          clearSongbookCache().then(() => {
            if (allData.length > 0) {
              cacheSongbookFiles(allData).catch(() => {});
            }
          }).catch(() => {});
        });
      }
    } catch {
      console.warn('[useSongbookFiles] Network fetch timeout/failed, using cache data');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFiles();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('songbook-files-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'songbook_files' },
        () => fetchFiles()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFiles]);

  const isUploading = useRef(false);

  const uploadFiles = useCallback(async (
    fileList: FileList | File[],
    onProgress?: (current: number, total: number) => void,
  ): Promise<number> => {
    // Guard against concurrent uploads
    if (isUploading.current) {
      toast.warning('Upload già in corso, attendi...');
      return 0;
    }
    isUploading.current = true;

    try {
      const allFiles = Array.from(fileList);
      const choFiles: File[] = [];
      const zipFiles: File[] = [];

      for (const f of allFiles) {
        const name = f.name.toLowerCase();
        if (name.endsWith('.cho')) choFiles.push(f);
        else if (name.endsWith('.zip')) zipFiles.push(f);
        else toast.warning(`File ignorato (non .cho/.zip): ${f.name}`);
      }

      // Extract .cho from ZIP files
      for (const zipFile of zipFiles) {
        try {
          const zipData = await zipFile.arrayBuffer();
          const zip = await JSZip.loadAsync(zipData);
          for (const [path, entry] of Object.entries(zip.files)) {
            if (entry.dir) continue;
            const fileName = path.split('/').pop() || path;
            if (!fileName.toLowerCase().endsWith('.cho')) continue;
            const content = await entry.async('string');
            const blob = new Blob([content], { type: 'text/plain' });
            choFiles.push(new File([blob], fileName));
          }
        } catch (err) {
          console.error('Error extracting ZIP:', err);
          toast.error(`Errore apertura ZIP: ${zipFile.name}`);
        }
      }

      if (choFiles.length === 0) return 0;

      // Read all file contents
      const records: { title: string; artist: string | null; content: string; filename: string }[] = [];
      for (const file of choFiles) {
        const content = await file.text();
        const { title, artist } = extractChordProTitle(content);
        records.push({
          title: title || file.name.replace(/\.cho$/i, ''),
          artist: artist || null,
          content,
          filename: file.name,
        });
      }

      // Batch insert in chunks of 200
      const BATCH_SIZE = 200;
      let successCount = 0;
      let duplicateCount = 0;

      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase
          .from('songbook_files')
          .upsert(batch, { onConflict: 'filename', ignoreDuplicates: true })
          .select('id');

        if (error) {
          console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error);
          // Fallback: insert one by one for this batch
          for (const rec of batch) {
            const { error: singleErr } = await supabase
              .from('songbook_files')
              .insert(rec);
            if (!singleErr) {
              successCount++;
            } else if (singleErr.code === '23505') {
              duplicateCount++;
            }
          }
        } else {
          successCount += data?.length ?? batch.length;
        }

        onProgress?.(Math.min(i + BATCH_SIZE, records.length), records.length);
        // Yield to UI thread
        await new Promise(r => setTimeout(r, 30));
      }

      if (successCount > 0) {
        toast.success(`${successCount} file caricati${duplicateCount > 0 ? ` (${duplicateCount} duplicati ignorati)` : ''}`);
        await fetchFiles();
        import('@/lib/autoSyncLAN').then(m => m.autoSyncToLAN('songbook')).catch(() => {});
      } else if (duplicateCount > 0) {
        toast.info(`${duplicateCount} file già esistenti, nessun nuovo caricamento`);
      }

      return successCount;
    } finally {
      isUploading.current = false;
    }
  }, [fetchFiles]);

  const importFromUrl = useCallback(async (
    url: string,
    googleApiKey?: string,
    onProgress?: (msg: string) => void,
  ): Promise<{ imported: number; duplicates: number; errors: string[] }> => {
    onProgress?.('Avvio importazione...');
    try {
      const { data, error } = await supabase.functions.invoke('import-songbook-from-url', {
        body: { url, googleApiKey },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Importazione fallita');

      const result = { imported: data.imported, duplicates: data.duplicates, errors: data.errors || [] };

      if (result.imported > 0) {
        toast.success(`${result.imported} file importati${result.duplicates > 0 ? ` (${result.duplicates} duplicati)` : ''}`);
        await fetchFiles();
      } else if (result.duplicates > 0) {
        toast.info(`${result.duplicates} file già esistenti`);
      }

      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} file con errori`);
        console.warn('[importFromUrl] Errors:', result.errors);
      }

      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore importazione';
      toast.error(msg);
      throw err;
    }
  }, [fetchFiles]);

  const updateFile = useCallback(async (id: string, updates: Partial<SongbookFile>): Promise<boolean> => {
    const { error } = await supabase
      .from('songbook_files')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating songbook file:', error);
      toast.error('Errore aggiornamento file');
      return false;
    }

    toast.success('File aggiornato');
    import('@/lib/autoSyncLAN').then(m => m.autoSyncToLAN('songbook')).catch(() => {});
    return true;
  }, []);

  const deleteFile = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Clear catalog_songbook_links referencing this file
      const { error: linksError } = await supabase
        .from('catalog_songbook_links')
        .delete()
        .eq('songbook_file_id', id);
      if (linksError) throw linksError;

      // Clear songbook_setlist_songs referencing this file
      const { error: setlistError } = await supabase
        .from('songbook_setlist_songs')
        .delete()
        .eq('songbook_file_id', id);
      if (setlistError) throw setlistError;

      // Clear broadcast_sessions referencing this file
      const { error: broadcastError } = await supabase
        .from('broadcast_sessions')
        .update({ songbook_file_id: null, songbook_mode: false })
        .eq('songbook_file_id', id);
      if (broadcastError) throw broadcastError;

      const { error } = await supabase
        .from('songbook_files')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Optimistic UI + cache cleanup to avoid stale local entries
      setFiles(prev => prev.filter(f => f.id !== id));
      import('@/lib/songbookCache').then(({ removeCachedFile }) => {
        removeCachedFile(id).catch(() => {});
      });

      toast.success('File eliminato');
      import('@/lib/autoSyncLAN').then(m => m.autoSyncToLAN('songbook')).catch(() => {});
      return true;
    } catch (err) {
      console.error('Error deleting songbook file:', err);
      toast.error('Errore eliminazione file');
      return false;
    }
  }, []);

  const deleteAllFiles = useCallback(async (): Promise<boolean> => {
    try {
      // First, clear any broadcast_sessions referencing songbook_files
      const { error: unlinkError } = await supabase
        .from('broadcast_sessions')
        .update({ songbook_file_id: null, songbook_mode: false })
        .not('songbook_file_id', 'is', null);

      if (unlinkError) {
        console.error('Error unlinking broadcast sessions:', unlinkError);
        toast.error('Errore: impossibile scollegare le sessioni attive');
        return false;
      }

      // Also clear catalog_songbook_links references
      const { error: linksError } = await supabase
        .from('catalog_songbook_links')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (linksError) {
        console.error('Error clearing catalog songbook links:', linksError);
      }

      // Also clear songbook_setlist_songs references
      const { error: setlistError } = await supabase
        .from('songbook_setlist_songs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (setlistError) {
        console.error('Error clearing setlist songs:', setlistError);
      }

      // Delete in batches to bypass the 1000-row limit
      let totalDeleted = 0;
      while (true) {
        const { data, error } = await supabase
          .from('songbook_files')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000')
          .select('id')
          .limit(500);

        if (error) {
          console.error('Error deleting songbook files:', error);
          toast.error('Errore eliminazione file');
          return false;
        }

        totalDeleted += (data?.length ?? 0);
        if (!data || data.length === 0) break;
      }

      const visibleCount = files.length;
      const displayDeleted = totalDeleted > 0 ? totalDeleted : visibleCount;

      // Immediately clear UI/cache to prevent stale IndexedDB ghost rows
      setFiles([]);
      import('@/lib/songbookCache').then(({ clearSongbookCache }) => {
        clearSongbookCache().catch(() => {});
      });

      toast.success(`Tutti i file eliminati (${displayDeleted})`);
      await fetchFiles();
      return true;
    } catch (err) {
      console.error('Error deleting all songbook files:', err);
      toast.error('Errore eliminazione file');
      return false;
    }
  }, [fetchFiles, files]);

  return {
    files,
    loading,
    uploadFiles,
    importFromUrl,
    updateFile,
    deleteFile,
    deleteAllFiles,
    refetch: fetchFiles,
  };
}

export function useSongbookSetlists() {
  const [setlists, setSetlists] = useState<SongbookSetlist[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSetlists = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const { data, error } = await supabase
        .from('songbook_setlists')
        .select('*')
        .order('updated_at', { ascending: false })
        .abortSignal(controller.signal);
      clearTimeout(timeout);

      if (error) {
        console.error('Error fetching songbook setlists:', error);
      }
      setSetlists((data || []) as SongbookSetlist[]);
    } catch {
      console.warn('[useSongbookSetlists] Network timeout, keeping current data');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSetlists();
  }, [fetchSetlists]);

  const createSetlist = useCallback(async (name: string, description?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Devi essere autenticato');
      return null;
    }

    const { data, error } = await supabase
      .from('songbook_setlists')
      .insert({ name, description, created_by: user.id })
      .select()
      .single();

    if (error) {
      console.error('Error creating songbook setlist:', error);
      toast.error('Errore creazione scaletta');
      return null;
    }

    await fetchSetlists();
    toast.success('Scaletta SongBook creata!');
    return data as SongbookSetlist;
  }, [fetchSetlists]);

  const updateSetlist = useCallback(async (id: string, updates: Partial<SongbookSetlist>) => {
    const { error } = await supabase
      .from('songbook_setlists')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating songbook setlist:', error);
      toast.error('Errore aggiornamento scaletta');
      return false;
    }

    await fetchSetlists();
    return true;
  }, [fetchSetlists]);

  const deleteSetlist = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('songbook_setlists')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting songbook setlist:', error);
      toast.error('Errore eliminazione scaletta');
      return false;
    }

    await fetchSetlists();
    toast.success('Scaletta eliminata');
    return true;
  }, [fetchSetlists]);

  return {
    setlists,
    loading,
    createSetlist,
    updateSetlist,
    deleteSetlist,
    refetch: fetchSetlists,
  };
}

export function useSongbookSetlistSongs(setlistId: string | null) {
  const [songs, setSongs] = useState<SongbookSetlistSong[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSongs = useCallback(async () => {
    if (!setlistId) {
      setSongs([]);
      return;
    }

    setLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const { data, error } = await supabase
        .from('songbook_setlist_songs')
        .select(`
          *,
          file:songbook_files(*)
        `)
        .eq('setlist_id', setlistId)
        .order('position', { ascending: true })
        .abortSignal(controller.signal);
      clearTimeout(timeout);

      if (error) {
        console.error('Error fetching songbook setlist songs:', error);
      }
      setSongs((data || []) as SongbookSetlistSong[]);
    } catch {
      console.warn('[useSongbookSetlistSongs] Network timeout, keeping current data');
    }
    setLoading(false);
  }, [setlistId]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const addSong = useCallback(async (fileId: string, position?: number) => {
    if (!setlistId) return false;

    const nextPosition = position ?? songs.length;
    
    const { error } = await supabase
      .from('songbook_setlist_songs')
      .insert({ setlist_id: setlistId, songbook_file_id: fileId, position: nextPosition });

    if (error) {
      console.error('Error adding song to songbook setlist:', error);
      toast.error('Errore aggiunta brano');
      return false;
    }

    await fetchSongs();
    return true;
  }, [setlistId, songs.length, fetchSongs]);

  const removeSong = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('songbook_setlist_songs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error removing song from songbook setlist:', error);
      toast.error('Errore rimozione brano');
      return false;
    }

    await fetchSongs();
    return true;
  }, [fetchSongs]);

  const reorderSongs = useCallback(async (orderedIds: string[]) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await supabase
        .from('songbook_setlist_songs')
        .update({ position: i })
        .eq('id', orderedIds[i]);
    }

    await fetchSongs();
  }, [fetchSongs]);

  return {
    songs,
    loading,
    addSong,
    removeSong,
    reorderSongs,
    refetch: fetchSongs,
  };
}
