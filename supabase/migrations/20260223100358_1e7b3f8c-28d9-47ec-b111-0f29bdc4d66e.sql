-- Add dual_broadcast flag to broadcast_sessions
-- When true: /trasmetti shows catalog text, /partiture shows .cho file
ALTER TABLE public.broadcast_sessions 
ADD COLUMN IF NOT EXISTS dual_broadcast boolean DEFAULT false;

-- Add to realtime publication (already enabled for this table)
COMMENT ON COLUMN public.broadcast_sessions.dual_broadcast IS 'When true, /trasmetti shows catalog text from current_song_id while /partiture shows .cho from songbook_file_id';