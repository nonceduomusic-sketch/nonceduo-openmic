-- Allow anyone to delete furore bookings (game is public, admin uses custom auth)
CREATE POLICY "Anyone can delete furore bookings"
ON public.furore_bookings
FOR DELETE
USING (true);

-- Allow anyone to delete furore players (game is public, admin uses custom auth)
CREATE POLICY "Anyone can delete furore players"
ON public.furore_players
FOR DELETE
USING (true);

-- Allow anyone to update furore players (for score updates from admin)
CREATE POLICY "Anyone can update furore players"
ON public.furore_players
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow anyone to update furore sessions (for admin controls)
CREATE POLICY "Anyone can update furore sessions"
ON public.furore_sessions
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow anyone to insert furore sessions
CREATE POLICY "Anyone can create furore sessions"
ON public.furore_sessions
FOR INSERT
WITH CHECK (true);