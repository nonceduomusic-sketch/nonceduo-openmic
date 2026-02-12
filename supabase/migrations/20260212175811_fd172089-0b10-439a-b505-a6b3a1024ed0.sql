
-- Add pin_required column to broadcast_remote_access (default true for backward compat)
ALTER TABLE public.broadcast_remote_access 
ADD COLUMN pin_required boolean NOT NULL DEFAULT true;
