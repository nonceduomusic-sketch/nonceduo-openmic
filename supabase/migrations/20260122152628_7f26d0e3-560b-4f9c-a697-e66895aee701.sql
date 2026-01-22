-- Add public read access to reservation_statuses for ALL users (including anonymous)
-- This table intentionally has no PII - it's a public view of song booking status

CREATE POLICY "Anyone can view reservation statuses"
ON public.reservation_statuses
FOR SELECT
USING (true);