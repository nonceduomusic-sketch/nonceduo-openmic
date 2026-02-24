ALTER TABLE public.global_format_settings 
ADD COLUMN IF NOT EXISTS visible_on_menu boolean NOT NULL DEFAULT true;