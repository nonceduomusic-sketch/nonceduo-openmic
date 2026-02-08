-- Add highlight_lines_count column to broadcast_sessions
-- Default 1 (current behavior), options: 1, 2, or 3
ALTER TABLE public.broadcast_sessions 
ADD COLUMN IF NOT EXISTS highlight_lines_count integer DEFAULT 1;

-- Add constraint to ensure only valid values
ALTER TABLE public.broadcast_sessions 
ADD CONSTRAINT highlight_lines_count_check 
CHECK (highlight_lines_count >= 1 AND highlight_lines_count <= 3);