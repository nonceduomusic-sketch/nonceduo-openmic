-- Add Telegram notification settings to assistant_settings
ALTER TABLE public.assistant_settings
ADD COLUMN IF NOT EXISTS telegram_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS telegram_chat_id text DEFAULT '',
ADD COLUMN IF NOT EXISTS notify_site boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_openmic boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_dediche boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_community boolean DEFAULT true;

-- Update the existing row with the provided chat ID
UPDATE public.assistant_settings
SET telegram_chat_id = '-5157831068'
WHERE id IS NOT NULL;