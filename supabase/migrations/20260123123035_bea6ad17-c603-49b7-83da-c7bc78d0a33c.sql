-- Drop the problematic unique constraint that blocks deactivation
ALTER TABLE public.live_sessions DROP CONSTRAINT IF EXISTS unique_active_session_per_section;

-- Create a partial unique index that only enforces uniqueness on ACTIVE sessions
-- This allows unlimited inactive sessions but only ONE active session per section
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_session_per_section_idx 
ON public.live_sessions (section) 
WHERE is_active = true;