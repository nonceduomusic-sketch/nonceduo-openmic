-- Fix: allow owner/admin/moderator to read Dediche conversations/messages/participants
-- Current policies grant staff visibility only to role=admin; this breaks realtime + unread counts for owner/moderator.

-- conversations: SELECT
DROP POLICY IF EXISTS "Users can view their conversations or public groups" ON public.conversations;
CREATE POLICY "Users can view their conversations or public groups"
ON public.conversations
FOR SELECT
USING (
  is_owner(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR ((is_public = true) AND (is_group = true))
  OR is_session_participant(id, ((current_setting('request.headers'::text, true))::json ->> 'x-session-id'::text))
);

-- chat_messages: SELECT
DROP POLICY IF EXISTS "Participants can view messages in their conversations" ON public.chat_messages;
CREATE POLICY "Participants can view messages in their conversations"
ON public.chat_messages
FOR SELECT
USING (
  is_owner(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR is_session_participant(conversation_id, ((current_setting('request.headers'::text, true))::json ->> 'x-session-id'::text))
  OR EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = chat_messages.conversation_id
      AND c.is_public = true
      AND c.is_group = true
  )
);

-- conversation_participants: SELECT
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants
FOR SELECT
USING (
  is_owner(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR is_session_participant(conversation_id, ((current_setting('request.headers'::text, true))::json ->> 'x-session-id'::text))
  OR EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = conversation_participants.conversation_id
      AND c.is_public = true
      AND c.is_group = true
  )
);
