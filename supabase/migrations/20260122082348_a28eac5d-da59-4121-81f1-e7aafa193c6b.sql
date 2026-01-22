-- Add section column to conversations to separate Dediche from Community
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS section text DEFAULT 'dediche' CHECK (section IN ('dediche', 'community'));

-- Add index for efficient filtering by section
CREATE INDEX IF NOT EXISTS idx_conversations_section ON public.conversations(section);

-- Update existing conversations: mark groups created by registered users as community
UPDATE public.conversations 
SET section = 'community' 
WHERE created_by_user_id IS NOT NULL;

-- Add is_registered_only default to false for backwards compatibility
ALTER TABLE public.conversations 
ALTER COLUMN is_registered_only SET DEFAULT false;