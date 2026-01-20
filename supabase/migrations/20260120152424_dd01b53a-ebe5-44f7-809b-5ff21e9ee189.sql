-- Drop and recreate the conversations SELECT policy to properly filter by session_id
DROP POLICY IF EXISTS "Users can view their own or public conversations" ON public.conversations;

-- Create a helper function to check session participation
CREATE OR REPLACE FUNCTION public.is_session_participant(conv_id UUID, session TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id AND session_id = session
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate policy - admins see all, public groups visible to all, 
-- others need to check via function or existing participants
CREATE POLICY "Users can view their own or public conversations" ON public.conversations
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (is_public = true AND is_group = true)
  OR EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
  )
);