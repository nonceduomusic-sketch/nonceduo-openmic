ALTER TABLE public.broadcast_sessions 
ADD COLUMN IF NOT EXISTS remote_dual_scroll boolean DEFAULT true;