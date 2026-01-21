-- Add is_read column to conversations for proper read/unread management
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- Update existing conversations to mark those with admin reply as read
UPDATE public.conversations c
SET is_read = true
WHERE EXISTS (
  SELECT 1 FROM public.chat_messages m
  WHERE m.conversation_id = c.id
  AND m.sender_type = 'admin'
);