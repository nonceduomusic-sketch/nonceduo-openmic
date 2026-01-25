-- Add new columns for event entity management
ALTER TABLE public.event_booking_rules
ADD COLUMN IF NOT EXISTS event_type text DEFAULT 'both' CHECK (event_type IN ('openmic', 'dediche', 'both')),
ADD COLUMN IF NOT EXISTS event_status text DEFAULT 'draft' CHECK (event_status IN ('draft', 'ready', 'live', 'closed')),
ADD COLUMN IF NOT EXISTS pin_code text,
ADD COLUMN IF NOT EXISTS pin_required boolean DEFAULT false;

-- Add index for quick lookup of live event
CREATE INDEX IF NOT EXISTS idx_event_booking_rules_status ON public.event_booking_rules(event_status);

-- Add comment for documentation
COMMENT ON COLUMN public.event_booking_rules.event_type IS 'Type of event: openmic only, dediche only, or both';
COMMENT ON COLUMN public.event_booking_rules.event_status IS 'Workflow status: draft (editing), ready (configured), live (active for users), closed (finished)';
COMMENT ON COLUMN public.event_booking_rules.pin_code IS 'Optional PIN code for event access';
COMMENT ON COLUMN public.event_booking_rules.pin_required IS 'Whether PIN is required to access this event';