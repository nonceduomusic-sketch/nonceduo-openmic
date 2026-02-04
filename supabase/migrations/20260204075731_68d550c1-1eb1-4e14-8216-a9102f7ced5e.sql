-- Add delivery status to assistant_messages
ALTER TABLE public.assistant_messages 
ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'read'));

-- Add edited_at column for message editing
ALTER TABLE public.assistant_messages 
ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone;

-- Update RLS to allow admins to update their own messages
CREATE POLICY "Admins can update own messages" 
ON public.assistant_messages 
FOR UPDATE 
USING (
  (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  AND sender_type = 'admin'
)
WITH CHECK (
  (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  AND sender_type = 'admin'
);

-- Allow admins to delete their own messages
CREATE POLICY "Admins can delete own messages" 
ON public.assistant_messages 
FOR DELETE 
USING (
  (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  AND sender_type = 'admin'
);

-- Allow admins to delete conversations
CREATE POLICY "Staff can delete conversations"
ON public.assistant_conversations
FOR DELETE
USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));