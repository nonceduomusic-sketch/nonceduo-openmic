import React, { useState } from 'react';
import { Heart, MessageCircle, Trash2, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Post, Comment, useSocialFeed } from '@/hooks/useSocialFeed';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onToggleLike: (postId: string, currentlyLiked: boolean) => Promise<boolean>;
  onDelete: (postId: string) => Promise<boolean>;
  onFetchComments: (postId: string) => Promise<Comment[]>;
  onAddComment: (postId: string, content: string) => Promise<boolean>;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  onToggleLike,
  onDelete,
  onFetchComments,
  onAddComment,
}) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const handleToggleComments = async () => {
    if (!showComments) {
      setLoadingComments(true);
      const fetchedComments = await onFetchComments(post.id);
      setComments(fetchedComments);
      setLoadingComments(false);
    }
    setShowComments(!showComments);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setSubmittingComment(true);
    const success = await onAddComment(post.id, newComment);
    if (success) {
      setNewComment('');
      const fetchedComments = await onFetchComments(post.id);
      setComments(fetchedComments);
    }
    setSubmittingComment(false);
  };

  const isOwner = currentUserId === post.user_id;

  return (
    <div className="glass-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            {post.author?.avatar_url ? (
              <img 
                src={post.author.avatar_url} 
                alt="" 
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <span className="font-bold text-foreground">
                {(post.author?.display_name || post.author?.username || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {post.author?.display_name || post.author?.username || 'Utente'}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: it })}
            </p>
          </div>
        </div>
        {isOwner && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(post.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <p className="text-foreground whitespace-pre-wrap">{post.content}</p>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className={`gap-2 ${post.has_liked ? 'text-red-500' : ''}`}
          onClick={() => onToggleLike(post.id, post.has_liked || false)}
        >
          <Heart className={`w-4 h-4 ${post.has_liked ? 'fill-current' : ''}`} />
          <span>{post.likes_count}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={handleToggleComments}
        >
          <MessageCircle className="w-4 h-4" />
          <span>{post.comments_count}</span>
        </Button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="pt-2 border-t border-border space-y-3">
          {loadingComments ? (
            <div className="flex justify-center py-2">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {comments.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium">
                          {(comment.author?.display_name || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-foreground">
                          {comment.author?.display_name || 'Utente'}
                        </span>
                        <span className="text-muted-foreground ml-2">{comment.content}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add comment form */}
              <form onSubmit={handleSubmitComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Scrivi un commento..."
                  className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  maxLength={300}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!newComment.trim() || submittingComment}
                  className="h-9 w-9"
                >
                  {submittingComment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
};

interface SocialFeedProps {
  userId?: string;
}

export const SocialFeed: React.FC<SocialFeedProps> = ({ userId }) => {
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  
  const {
    posts,
    loading,
    createPost,
    deletePost,
    toggleLike,
    fetchComments,
    addComment,
  } = useSocialFeed(userId);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;
    
    setIsPosting(true);
    const success = await createPost(newPostContent);
    if (success) {
      setNewPostContent('');
    }
    setIsPosting(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create Post */}
      {userId && (
        <form onSubmit={handleCreatePost} className="glass-card p-4 space-y-3">
          <Textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="Cosa stai pensando?"
            className="min-h-[80px] resize-none"
            maxLength={1000}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {newPostContent.length}/1000
            </span>
            <Button
              type="submit"
              disabled={!newPostContent.trim() || isPosting}
              className="neon-button-cyan"
            >
              {isPosting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Pubblica
            </Button>
          </div>
        </form>
      )}

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Nessun post ancora</p>
          <p className="text-sm text-muted-foreground">Sii il primo a pubblicare qualcosa!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={userId}
              onToggleLike={toggleLike}
              onDelete={deletePost}
              onFetchComments={fetchComments}
              onAddComment={addComment}
            />
          ))}
        </div>
      )}
    </div>
  );
};
