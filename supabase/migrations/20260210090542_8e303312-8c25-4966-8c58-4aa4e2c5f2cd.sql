
ALTER TABLE public.broadcast_sessions
ADD COLUMN IF NOT EXISTS broadcast_to_tv boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS broadcast_to_partiture boolean NOT NULL DEFAULT true;
