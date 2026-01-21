-- Add optional password protection for groups
ALTER TABLE public.conversations
ADD COLUMN password_hash TEXT NULL,
ADD COLUMN password_hint TEXT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.conversations.password_hash IS 'Optional PBKDF2 hash for group password protection';
COMMENT ON COLUMN public.conversations.password_hint IS 'Optional hint shown to users trying to join password-protected groups';