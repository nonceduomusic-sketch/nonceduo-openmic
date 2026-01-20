-- Create messages table for user-admin communication
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_name TEXT NOT NULL,
  message_text TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  admin_reply TEXT,
  replied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can create messages (public users sending messages)
CREATE POLICY "Anyone can create messages"
ON public.messages
FOR INSERT
WITH CHECK (true);

-- Policy: Anyone can view messages (for users to see replies)
CREATE POLICY "Anyone can view messages"
ON public.messages
FOR SELECT
USING (true);

-- Policy: Admins can update messages (mark as read, add reply)
CREATE POLICY "Admins can update messages"
ON public.messages
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Admins can delete messages
CREATE POLICY "Admins can delete messages"
ON public.messages
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;