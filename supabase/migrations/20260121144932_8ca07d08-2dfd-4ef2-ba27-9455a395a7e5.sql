-- Fix 1: Add unique constraint for typing_indicators to enable proper upsert
ALTER TABLE public.typing_indicators
ADD CONSTRAINT typing_indicators_conversation_session_unique 
UNIQUE (conversation_id, session_id);

-- Fix 2: Replace overly permissive typing indicators policy with session-based restrictions
-- First drop the permissive policy
DROP POLICY IF EXISTS "Users can manage their own typing indicators" ON public.typing_indicators;

-- Create separate policies for each operation
-- INSERT: Users can only insert their own typing indicators
CREATE POLICY "Users can insert own typing indicators"
ON public.typing_indicators
FOR INSERT
WITH CHECK (
  session_id = (current_setting('request.headers', true)::json->>'x-session-id')
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- UPDATE: Users can only update their own typing indicators
CREATE POLICY "Users can update own typing indicators"
ON public.typing_indicators
FOR UPDATE
USING (
  session_id = (current_setting('request.headers', true)::json->>'x-session-id')
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- DELETE: Users can only delete their own typing indicators
CREATE POLICY "Users can delete own typing indicators"
ON public.typing_indicators
FOR DELETE
USING (
  session_id = (current_setting('request.headers', true)::json->>'x-session-id')
  OR has_role(auth.uid(), 'admin'::app_role)
);