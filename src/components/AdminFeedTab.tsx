import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  RefreshCw,
  Trash2,
  Search,
  AlertTriangle,
  Newspaper,
  MessageSquare,
  Heart,
  RotateCcw,
} from 'lucide-react';

interface PostAuthor {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  author?: PostAuthor;
}

interface DeletedPost extends Post {
  deletedAt: number;
}

export const AdminFeedTab: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [deletedPosts, setDeletedPosts] = useState<DeletedPost[]>([]);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch authors for all posts
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(p => p.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, user_id, display_name, username, avatar_url')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        const postsWithAuthors = data.map(post => ({
          ...post,
          author: profileMap.get(post.user_id),
        }));

        setPosts(postsWithAuthors);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Errore nel caricamento dei post');
    } finally {
      setLoading(false);
    }
  };

  const restorePost = async (post: DeletedPost) => {
    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          id: post.id,
          user_id: post.user_id,
          content: post.content,
          likes_count: post.likes_count,
          comments_count: post.comments_count,
          created_at: post.created_at,
          updated_at: post.updated_at,
        });

      if (error) throw error;

      // Re-add to local state with author
      setPosts(prev => [{ ...post }, ...prev].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      
      // Remove from deleted list
      setDeletedPosts(prev => prev.filter(p => p.id !== post.id));
      
      toast.success('Post ripristinato');
    } catch (error) {
      console.error('Error restoring post:', error);
      toast.error('Errore nel ripristino del post');
    }
  };

  const restoreMultiplePosts = async (postsToRestore: DeletedPost[]) => {
    try {
      for (const post of postsToRestore) {
        await supabase
          .from('posts')
          .insert({
            id: post.id,
            user_id: post.user_id,
            content: post.content,
            likes_count: post.likes_count,
            comments_count: post.comments_count,
            created_at: post.created_at,
            updated_at: post.updated_at,
          });
      }

      // Re-add to local state
      setPosts(prev => [...postsToRestore, ...prev].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      
      // Remove from deleted list
      const restoredIds = new Set(postsToRestore.map(p => p.id));
      setDeletedPosts(prev => prev.filter(p => !restoredIds.has(p.id)));
      
      toast.success(`${postsToRestore.length} post ripristinati`);
    } catch (error) {
      console.error('Error restoring posts:', error);
      toast.error('Errore nel ripristino dei post');
    }
  };

  const deletePost = async (postId: string) => {
    // Find the post before deleting
    const postToDelete = posts.find(p => p.id === postId);
    if (!postToDelete) return;

    setIsDeleting(true);
    try {
      // First delete related comments and likes
      await supabase.from('post_comments').delete().eq('post_id', postId);
      await supabase.from('post_likes').delete().eq('post_id', postId);
      
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      // Store deleted post for undo
      const deletedPost: DeletedPost = { ...postToDelete, deletedAt: Date.now() };
      setDeletedPosts(prev => [...prev, deletedPost]);

      setPosts(prev => prev.filter(p => p.id !== postId));
      
      toast.success('Post eliminato', {
        action: {
          label: 'Annulla',
          onClick: () => restorePost(deletedPost),
        },
        duration: 8000,
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Errore durante l\'eliminazione');
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteAllPosts = async () => {
    // Store all posts for undo
    const postsToBackup = posts.map(p => ({ ...p, deletedAt: Date.now() } as DeletedPost));
    
    setIsResetting(true);
    try {
      // Delete all comments first
      const { error: commentsError } = await supabase
        .from('post_comments')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000');

      if (commentsError) throw commentsError;

      // Delete all likes
      const { error: likesError } = await supabase
        .from('post_likes')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000');

      if (likesError) throw likesError;

      // Delete all posts
      const { error } = await supabase
        .from('posts')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      // Store for undo
      setDeletedPosts(prev => [...prev, ...postsToBackup]);

      setPosts([]);
      toast.success(`Bacheca resettata (${postsToBackup.length} post eliminati)`, {
        action: {
          label: 'Annulla',
          onClick: () => restoreMultiplePosts(postsToBackup),
        },
        duration: 10000,
      });
    } catch (error) {
      console.error('Error resetting feed:', error);
      toast.error('Errore durante il reset della bacheca');
    } finally {
      setIsResetting(false);
    }
  };

  const getInitials = (name: string | null): string => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      post.content.toLowerCase().includes(query) ||
      post.author?.display_name?.toLowerCase().includes(query) ||
      post.author?.username?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Bacheca Social ({posts.length})</h2>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca post..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-60"
            />
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={fetchPosts}
            title="Ricarica"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={posts.length === 0}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Bacheca
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-destructive">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Reset Bacheca
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Sei sicuro di voler eliminare <strong>TUTTI</strong> i post della bacheca?
                  <br /><br />
                  Questa azione eliminerà anche tutti i commenti e i like associati.
                  <br /><br />
                  <span className="text-destructive font-medium">
                    Questa azione è irreversibile!
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction
                  onClick={deleteAllPosts}
                  disabled={isResetting}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isResetting ? 'Eliminazione...' : 'Elimina Tutto'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Posts List */}
      {filteredPosts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Newspaper className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'Nessun post trovato' : 'La bacheca è vuota'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={post.author?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {getInitials(post.author?.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {post.author?.display_name || 'Utente'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{post.author?.username || 'unknown'} · {formatDate(post.created_at)}
                        </p>
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Elimina Post</AlertDialogTitle>
                            <AlertDialogDescription>
                              Sei sicuro di voler eliminare questo post?
                              Questa azione eliminerà anche tutti i commenti e like associati.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePost(post.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Elimina
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    
                    <p className="mt-2 text-sm whitespace-pre-wrap break-words">
                      {post.content}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" />
                        {post.likes_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {post.comments_count}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
