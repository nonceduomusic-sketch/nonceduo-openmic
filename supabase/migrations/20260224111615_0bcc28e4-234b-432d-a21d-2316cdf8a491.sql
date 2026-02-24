
-- Add visible_on_app to global_format_settings
ALTER TABLE public.global_format_settings 
ADD COLUMN IF NOT EXISTS visible_on_app boolean NOT NULL DEFAULT true;

-- Add enabled_on_app to assistant_settings
ALTER TABLE public.assistant_settings 
ADD COLUMN IF NOT EXISTS enabled_on_app boolean NOT NULL DEFAULT true;
