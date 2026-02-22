
-- Add highlight_style column to broadcast_sessions (gradient = current behavior, uniform = all same)
ALTER TABLE public.broadcast_sessions 
ADD COLUMN IF NOT EXISTS highlight_style text DEFAULT 'gradient';

-- Update highlight_lines_count to allow up to 6
COMMENT ON COLUMN public.broadcast_sessions.highlight_lines_count IS 'Number of lines to highlight (1-6)';
COMMENT ON COLUMN public.broadcast_sessions.highlight_style IS 'gradient = main line brighter, uniform = all lines same intensity';
