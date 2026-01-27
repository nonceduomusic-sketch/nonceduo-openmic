-- Add individual enable flags for each user limit type
-- This allows admins to revert/disable limits after setting a value

-- Add flags to free_mode_settings
ALTER TABLE public.free_mode_settings
  ADD COLUMN IF NOT EXISTS user_limit_total_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_limit_consecutive_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_limit_interval_enabled boolean DEFAULT false;

-- Add flags to event_booking_rules
ALTER TABLE public.event_booking_rules
  ADD COLUMN IF NOT EXISTS user_limit_total_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_limit_consecutive_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_limit_interval_enabled boolean DEFAULT false;