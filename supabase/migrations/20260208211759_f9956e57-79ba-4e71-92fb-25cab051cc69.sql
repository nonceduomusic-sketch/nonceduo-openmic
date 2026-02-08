-- Add columns for ScreenStream functionality
ALTER TABLE public.broadcast_sessions
ADD COLUMN IF NOT EXISTS screen_stream_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS screen_stream_url text;