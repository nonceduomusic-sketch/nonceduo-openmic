
ALTER TABLE public.game_settings
  ADD COLUMN IF NOT EXISTS quiz_user_can_choose boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiz_user_show_random boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS quiz_user_show_general boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS quiz_user_show_sets boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS quiz_user_allowed_set_ids uuid[] DEFAULT '{}'::uuid[];
