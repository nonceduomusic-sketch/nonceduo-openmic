-- Create conversations table
CREATE TABLE public.conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text, -- NULL for 1-to-1, set for groups
    is_group boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create conversation participants table (tracks who is in each conversation)
CREATE TABLE public.conversation_participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    participant_name text NOT NULL,
    session_id text NOT NULL, -- To identify anonymous users
    joined_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(conversation_id, session_id)
);

-- Create new chat_messages table for the threaded system
CREATE TABLE public.chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    sender_type text NOT NULL CHECK (sender_type IN ('user', 'admin')),
    sender_name text NOT NULL,
    sender_session_id text, -- NULL for admin messages
    message_text text NOT NULL,
    edited_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Anyone can view conversations they participate in"
ON public.conversations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = conversations.id
    ) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Anyone can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update conversations"
ON public.conversations
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete conversations"
ON public.conversations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for conversation_participants
CREATE POLICY "Anyone can view participants"
ON public.conversation_participants
FOR SELECT
USING (true);

CREATE POLICY "Anyone can add participants"
ON public.conversation_participants
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update participants"
ON public.conversation_participants
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can remove participants"
ON public.conversation_participants
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for chat_messages
CREATE POLICY "Anyone can view messages in their conversations"
ON public.chat_messages
FOR SELECT
USING (true);

CREATE POLICY "Anyone can send messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can edit their own messages, admins can edit any"
ON public.chat_messages
FOR UPDATE
USING (
    (sender_type = 'user' AND sender_session_id IS NOT NULL) OR
    has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Only admins can delete messages"
ON public.chat_messages
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for all new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create function to update conversation updated_at
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations 
    SET updated_at = now() 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to update conversation timestamp when new message is added
CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_timestamp();