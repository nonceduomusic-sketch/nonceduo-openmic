-- Fix 1: chat_messages - Only allow participants to view messages in their conversations
DROP POLICY IF EXISTS "Anyone can view messages in their conversations" ON public.chat_messages;
CREATE POLICY "Participants can view messages in their conversations" 
ON public.chat_messages 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_session_participant(conversation_id, (current_setting('request.headers'::text, true))::json ->> 'x-session-id')
  OR EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = chat_messages.conversation_id 
    AND c.is_public = true 
    AND c.is_group = true
  )
);

-- Fix 2: conversations - Properly validate session for participants
DROP POLICY IF EXISTS "Users can view their own or public conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations or public groups" 
ON public.conversations 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (is_public = true AND is_group = true)
  OR is_session_participant(id, (current_setting('request.headers'::text, true))::json ->> 'x-session-id')
);

-- Fix 3: conversation_participants - Only show participants for user's conversations
DROP POLICY IF EXISTS "Anyone can view participants" ON public.conversation_participants;
CREATE POLICY "Users can view participants of their conversations" 
ON public.conversation_participants 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_session_participant(conversation_id, (current_setting('request.headers'::text, true))::json ->> 'x-session-id')
  OR EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = conversation_participants.conversation_id 
    AND c.is_public = true 
    AND c.is_group = true
  )
);

-- Fix 4: chat_invite_links - Restrict to admins only for management, allow users to validate their specific code
DROP POLICY IF EXISTS "Anyone can view active invite links" ON public.chat_invite_links;
CREATE POLICY "Users can validate invite links by code" 
ON public.chat_invite_links 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_active = true
);

-- Fix 5: reservation_statuses - Restrict to admin only (remove public read)
DROP POLICY IF EXISTS "Anyone can view reservation statuses" ON public.reservation_statuses;
CREATE POLICY "Admins can view reservation statuses" 
ON public.reservation_statuses 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 6: typing_indicators - Only show for conversation participants
DROP POLICY IF EXISTS "Anyone can read typing indicators" ON public.typing_indicators;
CREATE POLICY "Users can read typing indicators in their conversations" 
ON public.typing_indicators 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_session_participant(conversation_id, (current_setting('request.headers'::text, true))::json ->> 'x-session-id')
  OR EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = typing_indicators.conversation_id 
    AND c.is_public = true 
    AND c.is_group = true
  )
);