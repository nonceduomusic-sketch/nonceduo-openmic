-- Tighten overly-permissive INSERT policy on pin_sessions (was WITH CHECK (true))
DROP POLICY IF EXISTS "Anyone can create PIN sessions" ON public.pin_sessions;

CREATE POLICY "Anyone can create PIN sessions"
ON public.pin_sessions
FOR INSERT
TO public
WITH CHECK (
  live_session_id IS NOT NULL
  AND session_token ~ '^[0-9a-f]{64}$'
  AND pin_code_hash ~ '^[0-9a-f]{64}$'
  AND format IS NOT NULL
  AND length(btrim(format)) > 0
  AND length(format) <= 32
);
