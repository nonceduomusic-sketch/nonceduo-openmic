-- Fix: allow operator staff accounts to see/manage Assistant conversations in admin panel
-- (Previously policies only allowed owner/admin/moderator, so operator logins saw nothing.)

-- assistant_conversations
DROP POLICY IF EXISTS "Staff can manage all conversations" ON public.assistant_conversations;
CREATE POLICY "Staff can manage all conversations"
ON public.assistant_conversations
FOR ALL
TO public
USING (
  is_owner(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR has_role(auth.uid(), 'operator'::app_role)
)
WITH CHECK (
  is_owner(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR has_role(auth.uid(), 'operator'::app_role)
);

DROP POLICY IF EXISTS "Staff can delete conversations" ON public.assistant_conversations;
CREATE POLICY "Staff can delete conversations"
ON public.assistant_conversations
FOR DELETE
TO public
USING (
  is_owner(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR has_role(auth.uid(), 'operator'::app_role)
);

DROP POLICY IF EXISTS "Users can view own conversations" ON public.assistant_conversations;
CREATE POLICY "Users can view own conversations"
ON public.assistant_conversations
FOR SELECT
TO public
USING (
  (session_id = (current_setting('request.headers', true)::json ->> 'x-session-id'))
  OR (user_id = auth.uid())
  OR is_owner(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR has_role(auth.uid(), 'operator'::app_role)
);

-- assistant_messages
DROP POLICY IF EXISTS "Staff can manage all messages" ON public.assistant_messages;
CREATE POLICY "Staff can manage all messages"
ON public.assistant_messages
FOR ALL
TO public
USING (
  is_owner(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR has_role(auth.uid(), 'operator'::app_role)
)
WITH CHECK (
  is_owner(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR has_role(auth.uid(), 'operator'::app_role)
);

DROP POLICY IF EXISTS "Admins can update own messages" ON public.assistant_messages;
CREATE POLICY "Admins can update own messages"
ON public.assistant_messages
FOR UPDATE
TO public
USING (
  (is_owner(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
    OR has_role(auth.uid(), 'operator'::app_role)
  )
  AND (sender_type = 'admin')
)
WITH CHECK (
  (is_owner(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
    OR has_role(auth.uid(), 'operator'::app_role)
  )
  AND (sender_type = 'admin')
);

DROP POLICY IF EXISTS "Admins can delete own messages" ON public.assistant_messages;
CREATE POLICY "Admins can delete own messages"
ON public.assistant_messages
FOR DELETE
TO public
USING (
  (is_owner(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
    OR has_role(auth.uid(), 'operator'::app_role)
  )
  AND (sender_type = 'admin')
);

-- assistant_settings
DROP POLICY IF EXISTS "Staff can view assistant settings" ON public.assistant_settings;
CREATE POLICY "Staff can view assistant settings"
ON public.assistant_settings
FOR SELECT
TO public
USING (
  is_owner(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR has_role(auth.uid(), 'operator'::app_role)
);
