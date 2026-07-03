-- 1) Songbook / catalog / setlist writes: remove blanket ALL policies.
DROP POLICY IF EXISTS "Allow all songbook_files operations" ON public.songbook_files;
DROP POLICY IF EXISTS "Allow all catalog_songbook_links operations" ON public.catalog_songbook_links;
DROP POLICY IF EXISTS "Allow all songbook_setlist_songs operations" ON public.songbook_setlist_songs;

-- 2) Quiz question set members: replace blanket ALL with staff-managed + public read.
DROP POLICY IF EXISTS "Allow all access to quiz_question_set_members" ON public.quiz_question_set_members;
CREATE POLICY "Staff can manage quiz_question_set_members"
  ON public.quiz_question_set_members
  FOR ALL
  TO authenticated
  USING (
    public.is_owner(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
  WITH CHECK (
    public.is_owner(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );
CREATE POLICY "Anyone can read quiz_question_set_members"
  ON public.quiz_question_set_members
  FOR SELECT
  USING (true);

-- 3) Leaderboard: only staff can modify; triggers use SECURITY DEFINER so still work.
DROP POLICY IF EXISTS "Sistema può gestire classifica" ON public.leaderboard_stats;
CREATE POLICY "Staff can manage leaderboard"
  ON public.leaderboard_stats
  FOR ALL
  TO authenticated
  USING (
    public.is_owner(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
  WITH CHECK (
    public.is_owner(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

-- 4) Performance vote counts: same treatment (kept updated by triggers).
DROP POLICY IF EXISTS "Sistema può gestire conteggi" ON public.performance_vote_counts;
CREATE POLICY "Staff can manage performance vote counts"
  ON public.performance_vote_counts
  FOR ALL
  TO authenticated
  USING (
    public.is_owner(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  )
  WITH CHECK (
    public.is_owner(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'moderator'::app_role)
  );

-- 5) User booking counts: remove open UPDATE policy (only triggers should mutate).
DROP POLICY IF EXISTS "System can update booking counts" ON public.user_booking_counts;

-- 6) Furore game write-locks: only staff (or SECURITY DEFINER RPCs) may mutate players/sessions.
DROP POLICY IF EXISTS "Anyone can update furore sessions" ON public.furore_sessions;
DROP POLICY IF EXISTS "Anyone can update furore players" ON public.furore_players;
DROP POLICY IF EXISTS "Anyone can delete furore players" ON public.furore_players;

-- 7) Notification settings: contain email + Telegram chat IDs. Staff-only read.
DROP POLICY IF EXISTS "Anyone can read notification settings" ON public.notification_settings;
CREATE POLICY "Staff can read notification settings"
  ON public.notification_settings
  FOR SELECT
  TO authenticated
  USING (
    public.is_owner(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 8) Assistant settings: restrict full-row SELECT; expose safe view for anon.
DROP POLICY IF EXISTS "Anyone can check if assistant is enabled" ON public.assistant_settings;

CREATE OR REPLACE VIEW public.assistant_public_settings
WITH (security_invoker = true) AS
SELECT
  id,
  is_enabled,
  enabled_on_site,
  enabled_on_openmic,
  enabled_on_dediche,
  enabled_on_community,
  enabled_on_giochi,
  enabled_on_app,
  enabled_on_furore,
  welcome_on_site,
  welcome_on_openmic,
  welcome_on_dediche,
  welcome_on_community,
  welcome_message,
  proactive_delay_seconds,
  enabled_pages
FROM public.assistant_settings;

-- Base table SELECT allowed only at row level; sensitive columns hidden via column grants below.
CREATE POLICY "Public can read assistant settings (safe columns only)"
  ON public.assistant_settings
  FOR SELECT
  USING (true);

REVOKE SELECT ON public.assistant_settings FROM anon, authenticated;
GRANT SELECT (
  id, is_enabled, enabled_on_site, enabled_on_openmic, enabled_on_dediche,
  enabled_on_community, enabled_on_giochi, enabled_on_app, enabled_on_furore,
  welcome_on_site, welcome_on_openmic, welcome_on_dediche, welcome_on_community,
  welcome_message, proactive_delay_seconds, enabled_pages
) ON public.assistant_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.assistant_settings TO authenticated;
GRANT ALL ON public.assistant_settings TO service_role;
GRANT SELECT ON public.assistant_public_settings TO anon, authenticated;

-- 9) Broadcast remote sessions: remove anon SELECT; staff policies remain.
DROP POLICY IF EXISTS "Anon users can read own sessions" ON public.broadcast_remote_sessions;

-- 10) Event QR codes: don't expose pin_code to public; validation via existing RPC.
DROP POLICY IF EXISTS "Anyone can validate active QR codes" ON public.event_qr_codes;

-- 11) PIN sessions: remove full public SELECT. Clients validate via RPC and rely
--     on live_sessions realtime for invalidation notifications.
DROP POLICY IF EXISTS "Anyone can validate own session" ON public.pin_sessions;

-- 12) Performance votes: remove tautological UPDATE policy; add RPC for upsert.
DROP POLICY IF EXISTS "Users can update own votes" ON public.performance_votes;

CREATE OR REPLACE FUNCTION public.cast_performance_vote(
  p_reservation_id uuid,
  p_fingerprint text,
  p_vote_type text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_vote_type NOT IN ('fire', 'heart') THEN
    RAISE EXCEPTION 'invalid vote type';
  END IF;
  IF p_fingerprint IS NULL OR length(btrim(p_fingerprint)) < 6 THEN
    RAISE EXCEPTION 'invalid fingerprint';
  END IF;

  INSERT INTO public.performance_votes (reservation_id, voter_fingerprint, vote_type)
  VALUES (p_reservation_id, p_fingerprint, p_vote_type)
  ON CONFLICT (reservation_id, voter_fingerprint)
  DO UPDATE SET vote_type = EXCLUDED.vote_type;
END;
$$;

REVOKE ALL ON FUNCTION public.cast_performance_vote(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cast_performance_vote(uuid, text, text) TO anon, authenticated;

-- 13) Storage: don't allow anon to LIST all community-images objects.
--     Public read via public URL still works because the bucket is public.
DROP POLICY IF EXISTS "Anyone can view community images" ON storage.objects;
CREATE POLICY "Users can list own community images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'community-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );