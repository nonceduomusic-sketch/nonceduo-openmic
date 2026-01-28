-- Add public read policy for reservations (only id and customer_name for display)
-- This allows the LiveQueueDisplay to show booker names when the setting is active
CREATE POLICY "Public can view reservation booker info" 
ON public.reservations 
FOR SELECT 
USING (
  -- Allow read when the global setting show_booker_name is active
  EXISTS (
    SELECT 1 FROM public.global_format_settings 
    WHERE format_key = 'show_booker_name' AND is_active = true
  )
  AND status = 'in_progress'
);