-- Fix 1: Restrict profiles visibility to authenticated users only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix 2: Restrict chat_invite_links SELECT to authenticated users + admin
DROP POLICY IF EXISTS "Users can validate invite links by code" ON public.chat_invite_links;
CREATE POLICY "Authenticated users can validate active invite links" 
ON public.chat_invite_links 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (auth.uid() IS NOT NULL AND is_active = true)
);

-- Fix 3: Add better privacy for typing_indicators - only show in conversations user participates in
-- First drop overly permissive policies
DROP POLICY IF EXISTS "Users can read typing indicators in their conversations" ON public.typing_indicators;

-- Recreate with stricter rules - only participants or admins can see typing indicators
CREATE POLICY "Users can read typing indicators in their conversations" 
ON public.typing_indicators 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_session_participant(conversation_id, ((current_setting('request.headers'::text, true))::json ->> 'x-session-id'::text))
  OR (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = typing_indicators.conversation_id 
        AND c.is_public = true 
        AND c.is_group = true
    )
    AND (
      -- Require authentication for public group typing visibility
      auth.uid() IS NOT NULL
      OR is_session_participant(conversation_id, ((current_setting('request.headers'::text, true))::json ->> 'x-session-id'::text))
    )
  )
);