-- Add auto-scroll fields to broadcast_sessions
ALTER TABLE public.broadcast_sessions 
ADD COLUMN IF NOT EXISTS auto_scroll_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_scroll_bpm integer DEFAULT 60;

-- Comment for clarity
COMMENT ON COLUMN public.broadcast_sessions.auto_scroll_active IS 'Whether auto-scroll is currently running';
COMMENT ON COLUMN public.broadcast_sessions.auto_scroll_bpm IS 'Auto-scroll speed in beats per minute (tempo-based scrolling)';