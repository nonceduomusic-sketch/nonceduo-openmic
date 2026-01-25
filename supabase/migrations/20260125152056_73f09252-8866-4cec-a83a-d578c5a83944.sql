-- Fix infinite recursion in conversation_participants RLS policy
-- The issue is that the policy references itself through the subquery

-- Drop the problematic policy
DROP POLICY IF EXISTS "Participants and staff can view conversation members" ON public.conversation_participants;

-- Create a SECURITY DEFINER function to check participation without triggering RLS
CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id uuid, p_session_id text, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id 
      AND (session_id = p_session_id OR user_id = p_user_id)
  );
END;
$$;

-- Recreate the policy using the SECURITY DEFINER function
CREATE POLICY "Participants and staff can view conversation members" 
ON public.conversation_participants
FOR SELECT
USING (
  is_owner(auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR is_conversation_participant(
      conversation_id, 
      (current_setting('request.headers', true)::json->>'x-session-id'),
      auth.uid()
    )
  OR EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.id = conversation_participants.conversation_id 
      AND c.is_public = true 
      AND c.is_group = true 
      AND auth.uid() IS NOT NULL
  )
);