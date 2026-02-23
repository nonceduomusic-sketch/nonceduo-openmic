
ALTER TABLE public.broadcast_sessions
  ADD COLUMN IF NOT EXISTS partiture_highlight boolean DEFAULT true;
