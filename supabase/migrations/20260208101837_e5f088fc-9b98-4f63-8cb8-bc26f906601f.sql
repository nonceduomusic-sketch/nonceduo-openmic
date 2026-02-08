-- Add highlight_enabled to broadcast_sessions for controlling highlighting on/off
ALTER TABLE public.broadcast_sessions 
ADD COLUMN IF NOT EXISTS highlight_enabled boolean DEFAULT true;

-- Add comment explaining the field
COMMENT ON COLUMN public.broadcast_sessions.highlight_enabled IS 'When true, active line is highlighted. When false, all text is fully visible with no highlight.';