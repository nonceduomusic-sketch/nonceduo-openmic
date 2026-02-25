
-- Allow players to delete their own booking (via matching player's device_fingerprint)
CREATE POLICY "Players can delete own booking"
ON public.furore_bookings
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.furore_players fp
    WHERE fp.id = furore_bookings.player_id
      AND fp.device_fingerprint = (current_setting('request.headers', true)::json->>'x-device-fingerprint')
  )
);

-- Allow players to delete themselves (via device_fingerprint header)
CREATE POLICY "Players can delete themselves"
ON public.furore_players
FOR DELETE
USING (
  device_fingerprint = (current_setting('request.headers', true)::json->>'x-device-fingerprint')
);
