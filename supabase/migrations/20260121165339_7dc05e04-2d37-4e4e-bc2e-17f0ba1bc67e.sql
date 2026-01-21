-- Create friendships table for friend requests
CREATE TABLE public.friendships (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (requester_id, addressee_id)
);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can view their own friendships
CREATE POLICY "Users can view own friendships"
ON public.friendships FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Users can send friend requests
CREATE POLICY "Users can send friend requests"
ON public.friendships FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- Users can update friendships they're part of (accept/reject)
CREATE POLICY "Users can update own friendships"
ON public.friendships FOR UPDATE
USING (auth.uid() = addressee_id OR auth.uid() = requester_id);

-- Users can delete their own friendships
CREATE POLICY "Users can delete own friendships"
ON public.friendships FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Create message requests table (for first contact messages)
CREATE TABLE public.message_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (sender_id, recipient_id)
);

-- Enable RLS
ALTER TABLE public.message_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own message requests
CREATE POLICY "Users can view own message requests"
ON public.message_requests FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can send message requests
CREATE POLICY "Users can send message requests"
ON public.message_requests FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Recipients can update request status
CREATE POLICY "Recipients can update message requests"
ON public.message_requests FOR UPDATE
USING (auth.uid() = recipient_id);

-- Users can delete their own requests
CREATE POLICY "Users can delete own message requests"
ON public.message_requests FOR DELETE
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Update private_messages RLS to check for accepted request or friendship
DROP POLICY IF EXISTS "Users can view own private messages" ON public.private_messages;
DROP POLICY IF EXISTS "Users can send private messages" ON public.private_messages;

-- Create function to check if users can message each other
CREATE OR REPLACE FUNCTION public.can_message_user(sender UUID, recipient UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check if there's an accepted friendship
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = sender AND addressee_id = recipient)
           OR (requester_id = recipient AND addressee_id = sender))
  ) OR EXISTS (
    -- Or an accepted message request
    SELECT 1 FROM public.message_requests
    WHERE status = 'accepted'
      AND ((sender_id = sender AND recipient_id = recipient)
           OR (sender_id = recipient AND recipient_id = sender))
  )
$$;

-- New policy: Users can view messages if they're sender or recipient
CREATE POLICY "Users can view own private messages"
ON public.private_messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- New policy: Users can send messages if friendship/request is accepted
CREATE POLICY "Users can send private messages"
ON public.private_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND public.can_message_user(auth.uid(), recipient_id)
);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_requests;

-- Create indexes for performance
CREATE INDEX idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX idx_friendships_status ON public.friendships(status);
CREATE INDEX idx_message_requests_recipient ON public.message_requests(recipient_id);
CREATE INDEX idx_message_requests_status ON public.message_requests(status);

-- Trigger for updated_at on friendships
CREATE TRIGGER update_friendships_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();