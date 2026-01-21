import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SearchUser {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_online: boolean | null;
}

export const useUserSearch = (currentUserId?: string) => {
  const [results, setResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchTerm = `%${query.trim().toLowerCase()}%`;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, username, avatar_url, bio, is_online')
        .or(`display_name.ilike.${searchTerm},username.ilike.${searchTerm}`)
        .neq('user_id', currentUserId || '')
        .limit(20);

      if (error) throw error;

      setResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  const clearResults = () => setResults([]);

  return {
    results,
    loading,
    searchUsers,
    clearResults,
  };
};
