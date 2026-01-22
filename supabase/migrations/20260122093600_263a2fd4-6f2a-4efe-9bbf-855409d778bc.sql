-- Add per-invite approval toggle
ALTER TABLE public.chat_invite_links
ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_chat_invite_links_requires_approval
ON public.chat_invite_links(requires_approval);
