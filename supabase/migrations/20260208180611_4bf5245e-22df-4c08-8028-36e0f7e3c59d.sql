-- Add welcome message visibility flags per section
ALTER TABLE public.assistant_settings 
ADD COLUMN IF NOT EXISTS welcome_on_site boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS welcome_on_openmic boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS welcome_on_dediche boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS welcome_on_community boolean DEFAULT true;