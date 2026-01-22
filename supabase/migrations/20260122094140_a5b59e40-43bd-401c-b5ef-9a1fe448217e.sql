-- Tighten permissive INSERT policies (keep anonymous Dediche + bookings working)

-- conversations: allow anonymous inserts only for Dediche user->staff threads (non-group, non-public)
DROP POLICY IF EXISTS "Anyone can create conversations" ON public.conversations;
CREATE POLICY "Anyone can create dediche conversations"
ON public.conversations
FOR INSERT
WITH CHECK (
  section = 'dediche'
  AND is_group = false
  AND is_public = false
);

-- messages (legacy dediche messages table): restrict shape instead of WITH CHECK true
DROP POLICY IF EXISTS "Anyone can create messages" ON public.messages;
CREATE POLICY "Anyone can create messages"
ON public.messages
FOR INSERT
WITH CHECK (
  length(btrim(sender_name)) > 0
  AND length(sender_name) <= 50
  AND length(btrim(message_text)) > 0
  AND length(message_text) <= 500
);

-- reservations: restrict shape instead of WITH CHECK true
DROP POLICY IF EXISTS "Anyone can create reservations" ON public.reservations;
CREATE POLICY "Anyone can create reservations"
ON public.reservations
FOR INSERT
WITH CHECK (
  length(btrim(customer_name)) > 0
  AND length(customer_name) <= 80
  AND length(btrim(song_title)) > 0
  AND length(song_title) <= 120
  AND length(btrim(song_artist)) > 0
  AND length(song_artist) <= 120
);
