
-- Add quiz configuration columns to game_settings
ALTER TABLE public.game_settings 
ADD COLUMN IF NOT EXISTS quiz_source_mode text NOT NULL DEFAULT 'all_catalog',
ADD COLUMN IF NOT EXISTS quiz_source_set_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS quiz_order_mode text NOT NULL DEFAULT 'random';

-- quiz_source_mode: 'all_catalog' | 'all_sets' | 'general_only' | 'specific_sets'
-- quiz_order_mode: 'random' | 'sequential'
