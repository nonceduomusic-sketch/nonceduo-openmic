-- Add dedication field to reservations table
ALTER TABLE public.reservations 
ADD COLUMN dedication_message TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.reservations.dedication_message IS 'Optional dedication message added by user during booking';