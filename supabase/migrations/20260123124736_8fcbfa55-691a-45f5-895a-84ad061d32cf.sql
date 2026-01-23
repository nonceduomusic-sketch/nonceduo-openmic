-- =============================================
-- VIRAL + RETENTION FEATURES
-- =============================================

-- 1. Add link_url to posts for link sharing
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS link_url TEXT,
ADD COLUMN IF NOT EXISTS link_preview JSONB; -- Cache: { title, description, platform, favicon }

-- 2. Add category/tags to conversations (groups)
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_conversations_slug ON public.conversations(slug);

-- 3. Notifications table for retention
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'post_like', 'post_comment', 'friend_request', 'group_mention', 'message'
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb, -- { post_id, comment_id, from_user_id, etc. }
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- System can create notifications (via triggers/functions)
CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at) WHERE read_at IS NULL;

-- 4. Function to create notification on post like
CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_owner_id UUID;
  v_liker_name TEXT;
BEGIN
  -- Get post owner
  SELECT user_id INTO v_post_owner_id FROM public.posts WHERE id = NEW.post_id;
  
  -- Don't notify if liking own post
  IF v_post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get liker name
  SELECT COALESCE(display_name, username, 'Qualcuno') INTO v_liker_name 
  FROM public.profiles WHERE user_id = NEW.user_id;
  
  -- Create notification
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_post_owner_id,
    'post_like',
    '❤️ Nuovo like!',
    v_liker_name || ' ha messo like al tuo post',
    jsonb_build_object('post_id', NEW.post_id, 'from_user_id', NEW.user_id)
  );
  
  RETURN NEW;
END;
$$;

-- Trigger for post likes
DROP TRIGGER IF EXISTS trigger_notify_post_like ON public.post_likes;
CREATE TRIGGER trigger_notify_post_like
AFTER INSERT ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_post_like();

-- 5. Function to create notification on post comment
CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_owner_id UUID;
  v_commenter_name TEXT;
BEGIN
  -- Get post owner
  SELECT user_id INTO v_post_owner_id FROM public.posts WHERE id = NEW.post_id;
  
  -- Don't notify if commenting on own post
  IF v_post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get commenter name
  SELECT COALESCE(display_name, username, 'Qualcuno') INTO v_commenter_name 
  FROM public.profiles WHERE user_id = NEW.user_id;
  
  -- Create notification
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_post_owner_id,
    'post_comment',
    '💬 Nuovo commento!',
    v_commenter_name || ' ha commentato: "' || LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END || '"',
    jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id, 'from_user_id', NEW.user_id)
  );
  
  RETURN NEW;
END;
$$;

-- Trigger for post comments
DROP TRIGGER IF EXISTS trigger_notify_post_comment ON public.post_comments;
CREATE TRIGGER trigger_notify_post_comment
AFTER INSERT ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_post_comment();

-- 6. Function to notify on friend request
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_name TEXT;
BEGIN
  -- Get requester name
  SELECT COALESCE(display_name, username, 'Qualcuno') INTO v_requester_name 
  FROM public.profiles WHERE user_id = NEW.requester_id;
  
  -- Create notification for addressee
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.addressee_id,
    'friend_request',
    '👋 Richiesta di amicizia!',
    v_requester_name || ' vuole aggiungerti come amico',
    jsonb_build_object('friendship_id', NEW.id, 'from_user_id', NEW.requester_id)
  );
  
  RETURN NEW;
END;
$$;

-- Trigger for friend requests
DROP TRIGGER IF EXISTS trigger_notify_friend_request ON public.friendships;
CREATE TRIGGER trigger_notify_friend_request
AFTER INSERT ON public.friendships
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION public.notify_friend_request();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;