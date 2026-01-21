import { useState, useEffect, useCallback } from 'react';
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

export const useSocialFeed = (userId?: string) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    try {
      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (postsError) throw postsError;

      // Fetch profiles for authors
      const userIds = [...new Set(postsData?.map(p => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enrichedPosts: Post[] = (postsData || []).map(post => ({
        ...post,
        author: profileMap.get(post.user_id),
        has_liked: false,
      }));

      // Check if current user has liked each post
      if (userId && enrichedPosts.length > 0) {
        const { data: userLikes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', userId);

        const likedPostIds = new Set(userLikes?.map(l => l.post_id) || []);
        enrichedPosts.forEach(post => {
          post.has_liked = likedPostIds.has(post.id);
        });
      }

      setPosts(enrichedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPosts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('social-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => fetchPosts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

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
    if (currentlyLiked) {
      const success = await unlikePost(postId);
      if (success) {
        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { ...p, has_liked: false, likes_count: p.likes_count - 1 }
            : p
        ));
      }
      return success;
    } else {
      const success = await likePost(postId);
      if (success) {
        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { ...p, has_liked: true, likes_count: p.likes_count + 1 }
            : p
        ));
      }
      return success;
    }
  };

  const fetchComments = async (postId: string): Promise<Comment[]> => {
    try {
      const { data: comments, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch author profiles
      const userIds = [...new Set(comments?.map(c => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

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
      
      // Update local posts count
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
    createPost,
    deletePost,
    toggleLike,
    fetchComments,
    addComment,
    refetch: fetchPosts,
  };
};
