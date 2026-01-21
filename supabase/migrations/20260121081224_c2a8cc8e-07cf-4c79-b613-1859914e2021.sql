-- Fix 1: Add missing RLS policies for user_roles table
-- Only admins can manage roles (INSERT, UPDATE, DELETE)

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Add database-level input validation for messages table
-- Match client-side Zod validation limits

ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_name_len
  CHECK (length(trim(sender_name)) BETWEEN 1 AND 100);

ALTER TABLE public.messages
  ADD CONSTRAINT messages_message_text_len
  CHECK (length(trim(message_text)) BETWEEN 1 AND 1000);

ALTER TABLE public.messages
  ADD CONSTRAINT messages_admin_reply_len
  CHECK (admin_reply IS NULL OR length(trim(admin_reply)) BETWEEN 1 AND 1000);

-- Fix 3: Add database-level input validation for chat_messages table
-- (Similar protection needed for the new chat system)

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_sender_name_len
  CHECK (length(trim(sender_name)) BETWEEN 1 AND 100);

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_message_text_len
  CHECK (length(trim(message_text)) BETWEEN 1 AND 2000);

-- Fix 4: Restrict blocked_users table to only allow checking own session
-- Drop the permissive policy and create a more restrictive one

DROP POLICY IF EXISTS "Anyone can check if blocked" ON public.blocked_users;

-- Users can only check if THEIR session is blocked (no visibility into others)
CREATE POLICY "Users can check own block status"
ON public.blocked_users
FOR SELECT
USING (session_id = current_setting('request.headers', true)::json->>'x-session-id' OR has_role(auth.uid(), 'admin'::app_role));