-- Create blocked_users table for admin to block misbehaving users
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  blocked_by uuid REFERENCES auth.users(id),
  reason text,
  blocked_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone -- NULL means permanent
);

-- Enable RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Only admins can manage blocked users
CREATE POLICY "Admins can manage blocked users"
ON public.blocked_users
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can check if they're blocked (for client-side check)
CREATE POLICY "Anyone can check if blocked"
ON public.blocked_users
FOR SELECT
USING (true);

-- Update chat_messages INSERT policy to prevent blocked users from sending
DROP POLICY IF EXISTS "Anyone can send messages" ON public.chat_messages;

CREATE POLICY "Non-blocked users can send messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM blocked_users 
    WHERE blocked_users.session_id = chat_messages.sender_session_id
    AND (blocked_users.expires_at IS NULL OR blocked_users.expires_at > now())
  )
);

-- Same for conversation_participants
DROP POLICY IF EXISTS "Anyone can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Anyone can join public group conversations" ON public.conversation_participants;

CREATE POLICY "Non-blocked users can add participants"
ON public.conversation_participants
FOR INSERT
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM blocked_users 
    WHERE blocked_users.session_id = conversation_participants.session_id
    AND (blocked_users.expires_at IS NULL OR blocked_users.expires_at > now())
  )
);

-- Add realtime for blocked_users
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_users;