import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PostAuthor {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  author?: PostAuthor;
  has_liked?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: PostAuthor;
}

// Scalability constants
const PAGE_SIZE = 20;
const POLLING_INTERVAL = 30000; // 30 seconds - no realtime for feed (saves connections)

export const useSocialFeed = (userId?: string) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPosts = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    try {
      if (pageNum === 0) setLoading(true);
      else setLoadingMore(true);

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Fetch posts with pagination
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (postsError) throw postsError;

      // Check if there are more posts
      setHasMore((postsData?.length || 0) === PAGE_SIZE);

      // Fetch profiles for authors (batch query)
      const userIds = [...new Set(postsData?.map(p => p.user_id) || [])];
      
      let profileMap = new Map<string, PostAuthor>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, user_id, display_name, username, avatar_url')
          .in('user_id', userIds);
        profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      }

      const enrichedPosts: Post[] = (postsData || []).map(post => ({
        ...post,
        author: profileMap.get(post.user_id),
        has_liked: false,
      }));

      // Check if current user has liked each post (single batch query)
      if (userId && enrichedPosts.length > 0) {
        const postIds = enrichedPosts.map(p => p.id);
        const { data: userLikes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', userId)
          .in('post_id', postIds);

        const likedPostIds = new Set(userLikes?.map(l => l.post_id) || []);
        enrichedPosts.forEach(post => {
          post.has_liked = likedPostIds.has(post.id);
        });
      }

      if (append) {
        setPosts(prev => [...prev, ...enrichedPosts]);
      } else {
        setPosts(enrichedPosts);
      }
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId]);

  // Load more posts (pagination)
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchPosts(page + 1, true);
    }
  }, [fetchPosts, page, loadingMore, hasMore]);

  // Refresh feed (pull to refresh)
  const refresh = useCallback(() => {
    setPage(0);
    setHasMore(true);
    fetchPosts(0, false);
  }, [fetchPosts]);

  useEffect(() => {
    fetchPosts(0, false);

    // Use polling instead of realtime for feed (saves connections for 100K+ users)
    pollingRef.current = setInterval(() => {
      // Only refresh if we're on page 0 (top of feed)
      if (page === 0) {
        fetchPosts(0, false);
      }
    }, POLLING_INTERVAL);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchPosts, page]);

  const createPost = async (content: string): Promise<boolean> => {
    if (!userId) {
      toast.error('Devi essere autenticato');
      return false;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .insert([{ user_id: userId, content: content.trim() }]);

      if (error) throw error;
      toast.success('Post pubblicato!');
      // Refresh to show new post at top
      refresh();
      return true;
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error('Errore nella pubblicazione');
      return false;
    }
  };

  const deletePost = async (postId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      
      // Remove from local state immediately
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Post eliminato');
      return true;
    } catch (error: any) {
      console.error('Error deleting post:', error);
      toast.error('Errore nell\'eliminazione');
      return false;
    }
  };

  const likePost = async (postId: string): Promise<boolean> => {
    if (!userId) {
      toast.error('Devi essere autenticato');
      return false;
    }

    try {
      const { error } = await supabase
        .from('post_likes')
        .insert([{ post_id: postId, user_id: userId }]);

      if (error) {
        if (error.code === '23505') {
          // Already liked, unlike
          await unlikePost(postId);
          return true;
        }
        throw error;
      }
      return true;
    } catch (error: any) {
      console.error('Error liking post:', error);
      return false;
    }
  };

  const unlikePost = async (postId: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error unliking post:', error);
      return false;
    }
  };

  const toggleLike = async (postId: string, currentlyLiked: boolean): Promise<boolean> => {
    // Optimistic update
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { 
            ...p, 
            has_liked: !currentlyLiked, 
            likes_count: currentlyLiked ? p.likes_count - 1 : p.likes_count + 1 
          }
        : p
    ));

    const success = currentlyLiked 
      ? await unlikePost(postId)
      : await likePost(postId);

    // Rollback on failure
    if (!success) {
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { 
              ...p, 
              has_liked: currentlyLiked, 
              likes_count: currentlyLiked ? p.likes_count + 1 : p.likes_count - 1 
            }
          : p
      ));
    }

    return success;
  };

  const fetchComments = async (postId: string, limit: number = 50): Promise<Comment[]> => {
    try {
      const { data: comments, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      // Fetch author profiles (batch)
      const userIds = [...new Set(comments?.map(c => c.user_id) || [])];
      
      let profileMap = new Map<string, PostAuthor>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, user_id, display_name, username, avatar_url')
          .in('user_id', userIds);
        profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      }

      return (comments || []).map(comment => ({
        ...comment,
        author: profileMap.get(comment.user_id),
      }));
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  };

  const addComment = async (postId: string, content: string): Promise<boolean> => {
    if (!userId) {
      toast.error('Devi essere autenticato');
      return false;
    }

    try {
      const { error } = await supabase
        .from('post_comments')
        .insert([{ post_id: postId, user_id: userId, content: content.trim() }]);

      if (error) throw error;
      
      // Update local posts count (optimistic)
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, comments_count: p.comments_count + 1 }
          : p
      ));
      
      return true;
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error('Errore nell\'aggiunta del commento');
      return false;
    }
  };

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refresh,
    createPost,
    deletePost,
    toggleLike,
    fetchComments,
    addComment,
    refetch: refresh,
  };
};
