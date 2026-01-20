-- Add is_public column to conversations for group visibility management
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- Add allowed_participants column to store JSON array of session_ids allowed when is_public=false
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS allowed_participants text[] DEFAULT '{}';

-- Update RLS policy for conversations to handle public/private visibility
DROP POLICY IF EXISTS "Anyone can view conversations they participate in" ON public.conversations;

CREATE POLICY "Users can view their own or public conversations" 
ON public.conversations 
FOR SELECT 
USING (
  -- Admins can see all
  has_role(auth.uid(), 'admin'::app_role) 
  OR
  -- Users can see conversations they participate in
  EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_participants.conversation_id = conversations.id
  )
  OR
  -- Anyone can see public conversations
  (is_public = true AND is_group = true)
);

-- Policy for users to join public conversations
CREATE POLICY "Anyone can join public group conversations" 
ON public.conversation_participants 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = conversation_id 
    AND conversations.is_public = true 
    AND conversations.is_group = true
  )
  OR true  -- Keep existing behavior for non-public
);