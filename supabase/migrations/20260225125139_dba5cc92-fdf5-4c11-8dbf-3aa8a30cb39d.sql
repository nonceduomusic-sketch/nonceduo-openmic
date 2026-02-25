-- Add score column to furore_players (persists across rounds)
ALTER TABLE public.furore_players ADD COLUMN IF NOT EXISTS score integer NOT NULL DEFAULT 0;

-- Add show_leaderboard flag to furore_sessions (controls TV display)
ALTER TABLE public.furore_sessions ADD COLUMN IF NOT EXISTS show_leaderboard boolean NOT NULL DEFAULT false;