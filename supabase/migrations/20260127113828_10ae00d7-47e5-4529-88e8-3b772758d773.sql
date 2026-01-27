-- Add dedicated columns for interval-based limits (do not reuse songs_count)
ALTER TABLE public.user_booking_counts
ADD COLUMN IF NOT EXISTS songs_interval_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS interval_window_started_at timestamp with time zone NULL;

-- Helpful index for interval window lookups per event/session
CREATE INDEX IF NOT EXISTS idx_user_booking_counts_interval_window
ON public.user_booking_counts (event_id, session_fingerprint, interval_window_started_at);
