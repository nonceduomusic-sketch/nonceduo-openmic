
ALTER TABLE public.event_booking_rules 
ADD COLUMN IF NOT EXISTS show_pin_on_gate boolean DEFAULT false;

ALTER TABLE public.free_mode_settings 
ADD COLUMN IF NOT EXISTS show_pin_on_gate boolean DEFAULT false;
