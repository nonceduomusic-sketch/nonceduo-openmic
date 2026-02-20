import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { extractChordProTitle } from '@/lib/chordpro';

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

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    
    // Fetch all files (bypass 1000 row limit with pagination)
    const allData: SongbookFile[] = [];
    const pageSize = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('songbook_files')
        .select('*')
        .order('is_variant', { ascending: true })
        .order('title', { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error('Error fetching songbook files:', error);
        toast.error('Errore caricamento file SongBook');
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

    setFiles(allData);
    setLoading(false);
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

  const uploadFile = useCallback(async (file: File): Promise<boolean> => {
    try {
      const content = await file.text();
      const { title, artist } = extractChordProTitle(content);
      
      const { error } = await supabase
        .from('songbook_files')
        .insert({
          title: title || file.name.replace(/\.cho$/i, ''),
          artist: artist || null,
          content,
          filename: file.name,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error(`File "${file.name}" già esistente`);
        } else {
          throw error;
        }
        return false;
      }

      return true;
    } catch (err: any) {
      console.error('Error uploading songbook file:', err);
      toast.error(`Errore upload: ${file.name}`);
      return false;
    }
  }, []);

  const uploadFiles = useCallback(async (fileList: FileList | File[]): Promise<number> => {
    const files = Array.from(fileList);
    let successCount = 0;

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.cho')) {
        toast.warning(`File ignorato (non .cho): ${file.name}`);
        continue;
      }
      const success = await uploadFile(file);
      if (success) successCount++;
    }

    if (successCount > 0) {
      toast.success(`${successCount} file caricati con successo`);
      await fetchFiles();
      // Auto-sync to LAN server in background
      import('@/lib/autoSyncLAN').then(m => m.autoSyncToLAN('songbook')).catch(() => {});
    }

    return successCount;
  }, [uploadFile, fetchFiles]);

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
    const { error } = await supabase
      .from('songbook_files')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting songbook file:', error);
      toast.error('Errore eliminazione file');
      return false;
    }

    toast.success('File eliminato');
    import('@/lib/autoSyncLAN').then(m => m.autoSyncToLAN('songbook')).catch(() => {});
    return true;
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

      // Also clear songbook_setlist_songs references
      const { data: setlists } = await supabase
        .from('songbook_setlist_songs')
        .select('id')
        .limit(1);
      
      if (setlists && setlists.length > 0) {
        const { error: setlistError } = await supabase
          .from('songbook_setlist_songs')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (setlistError) {
          console.error('Error clearing setlist songs:', setlistError);
        }
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

      toast.success(`Tutti i file eliminati (${totalDeleted})`);
      await fetchFiles();
      return true;
    } catch (err) {
      console.error('Error deleting all songbook files:', err);
      toast.error('Errore eliminazione file');
      return false;
    }
  }, [fetchFiles]);

  return {
    files,
    loading,
    uploadFiles,
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
    const { data, error } = await supabase
      .from('songbook_setlists')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching songbook setlists:', error);
    }
    setSetlists((data || []) as SongbookSetlist[]);
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
    const { data, error } = await supabase
      .from('songbook_setlist_songs')
      .select(`
        *,
        file:songbook_files(*)
      `)
      .eq('setlist_id', setlistId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching songbook setlist songs:', error);
    }
    setSongs((data || []) as SongbookSetlistSong[]);
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
