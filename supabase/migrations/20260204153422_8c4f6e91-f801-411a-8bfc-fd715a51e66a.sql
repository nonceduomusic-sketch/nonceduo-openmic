-- Add tv_view_mode column to broadcast_sessions to sync the selected style to the TV
ALTER TABLE public.broadcast_sessions 
ADD COLUMN IF NOT EXISTS tv_view_mode text DEFAULT 'karaoke';

-- Add is_broadcasting flag to control when the TV should show lyrics vs preview/waiting
-- This separates "preparing" (admin preview) from "live" (showing to audience)
ALTER TABLE public.broadcast_sessions 
ADD COLUMN IF NOT EXISTS is_broadcasting boolean DEFAULT false;

COMMENT ON COLUMN public.broadcast_sessions.tv_view_mode IS 'The display style for the TV: compact, karaoke, or spotify';
COMMENT ON COLUMN public.broadcast_sessions.is_broadcasting IS 'When true, the TV shows live lyrics. When false, shows waiting screen.';