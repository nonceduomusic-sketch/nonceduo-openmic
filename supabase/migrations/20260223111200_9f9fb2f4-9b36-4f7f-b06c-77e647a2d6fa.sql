
-- Add partiture control fields to broadcast_sessions
ALTER TABLE public.broadcast_sessions
  ADD COLUMN IF NOT EXISTS partiture_follow boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS partiture_dim_inactive boolean DEFAULT false;
