-- Add screen share fields to broadcast_sessions
ALTER TABLE public.broadcast_sessions 
ADD COLUMN IF NOT EXISTS screen_share_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS screen_share_offer jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS screen_share_answer jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS screen_share_ice_candidates jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS screen_share_started_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS screen_share_stopped_reason text DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.broadcast_sessions.screen_share_active IS 'Whether screen sharing is currently active';
COMMENT ON COLUMN public.broadcast_sessions.screen_share_offer IS 'WebRTC SDP offer from broadcaster';
COMMENT ON COLUMN public.broadcast_sessions.screen_share_answer IS 'WebRTC SDP answer from viewer';
COMMENT ON COLUMN public.broadcast_sessions.screen_share_ice_candidates IS 'ICE candidates for WebRTC connection';