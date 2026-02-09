-- Allow anyone to update broadcast_sessions (it's a backstage control table)
-- This enables /songbook-live to work without requiring authentication
CREATE POLICY "Anyone can update broadcast sessions"
ON public.broadcast_sessions
FOR UPDATE
USING (true)
WITH CHECK (true);