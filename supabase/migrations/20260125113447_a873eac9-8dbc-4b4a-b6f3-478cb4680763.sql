-- Add visibility column to conversations for Dediche
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'author_only';

-- Add check constraint for valid visibility values
ALTER TABLE public.conversations 
ADD CONSTRAINT conversations_visibility_check 
CHECK (visibility IN ('public', 'admin_only', 'author_only'));

-- Update existing dediche conversations to default visibility
UPDATE public.conversations 
SET visibility = 'author_only' 
WHERE section = 'dediche' AND visibility IS NULL;

-- Drop existing SELECT policy and recreate with visibility logic
DROP POLICY IF EXISTS "Users can view their conversations or public groups" ON public.conversations;

CREATE POLICY "Users can view conversations based on visibility"
ON public.conversations FOR SELECT
USING (
  -- Staff can always view all conversations
  is_owner(auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role) OR
  -- Public groups are visible to everyone
  (is_public = true AND is_group = true) OR
  -- User is a participant
  is_session_participant(id, (current_setting('request.headers'::text, true)::json->>'x-session-id')) OR
  -- Dediche visibility rules: public dediche are visible to all
  (section = 'dediche' AND visibility = 'public')
);

-- Add comment for documentation
COMMENT ON COLUMN public.conversations.visibility IS 'Controls who can see dediche: public (everyone), admin_only (staff only), author_only (author + staff)';