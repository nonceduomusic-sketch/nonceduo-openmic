-- Add event_name column to free_mode_settings for parity with scheduled events
ALTER TABLE public.free_mode_settings 
ADD COLUMN IF NOT EXISTS event_name TEXT DEFAULT 'Evento Libero';

-- Add event_status column for state management  
ALTER TABLE public.free_mode_settings 
ADD COLUMN IF NOT EXISTS event_status TEXT DEFAULT 'draft';

-- Comment for clarity
COMMENT ON COLUMN public.free_mode_settings.event_name IS 'Nome dell''evento visualizzato nelle pagine dei format';
COMMENT ON COLUMN public.free_mode_settings.event_status IS 'Stato dell''evento: draft, ready, live, closed';