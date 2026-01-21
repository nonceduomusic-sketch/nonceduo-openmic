-- Create table for chat invite links
CREATE TABLE public.chat_invite_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER,
  use_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.chat_invite_links ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view active invite links"
ON public.chat_invite_links
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage invite links"
ON public.chat_invite_links
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Index for quick lookups by invite code
CREATE INDEX idx_chat_invite_links_code ON public.chat_invite_links(invite_code);
CREATE INDEX idx_chat_invite_links_conversation ON public.chat_invite_links(conversation_id);