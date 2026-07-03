
-- 1. Archive table for reservations
CREATE TABLE IF NOT EXISTS public.reservations_archive (
  id UUID PRIMARY KEY,
  customer_name TEXT,
  song_title TEXT,
  song_artist TEXT,
  song_key TEXT,
  status TEXT,
  dedication_message TEXT,
  original_created_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archive_batch_id UUID NOT NULL,
  original_data JSONB NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations_archive TO authenticated;
GRANT ALL ON public.reservations_archive TO service_role;

ALTER TABLE public.reservations_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only owners can access archive"
ON public.reservations_archive
FOR ALL
TO authenticated
USING (public.is_owner(auth.uid()))
WITH CHECK (public.is_owner(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_reservations_archive_batch ON public.reservations_archive(archive_batch_id);
CREATE INDEX IF NOT EXISTS idx_reservations_archive_at ON public.reservations_archive(archived_at DESC);

-- 2. DB stats function
CREATE OR REPLACE FUNCTION public.admin_db_stats()
RETURNS TABLE(table_name TEXT, row_count BIGINT, total_size_bytes BIGINT, total_size_pretty TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    c.relname::TEXT AS table_name,
    c.reltuples::BIGINT AS row_count,
    pg_total_relation_size(c.oid)::BIGINT AS total_size_bytes,
    pg_size_pretty(pg_total_relation_size(c.oid))::TEXT AS total_size_pretty
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
  ORDER BY pg_total_relation_size(c.oid) DESC;
END;
$$;

-- 3. Cleanup by age (days)
CREATE OR REPLACE FUNCTION public.admin_cleanup_by_age(p_days INTEGER, p_dry_run BOOLEAN DEFAULT true)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSONB := '{}'::jsonb;
  v_count BIGINT;
  v_cutoff TIMESTAMPTZ := now() - (p_days || ' days')::interval;
  v_cutoff_short TIMESTAMPTZ := now() - '7 days'::interval;
  v_cutoff_pin TIMESTAMPTZ := now() - '30 days'::interval;
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- chat_messages
  IF p_dry_run THEN
    SELECT COUNT(*) INTO v_count FROM chat_messages WHERE created_at < v_cutoff;
  ELSE
    WITH d AS (DELETE FROM chat_messages WHERE created_at < v_cutoff RETURNING 1)
    SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('chat_messages', v_count);

  -- messages
  IF p_dry_run THEN
    SELECT COUNT(*) INTO v_count FROM messages WHERE created_at < v_cutoff;
  ELSE
    WITH d AS (DELETE FROM messages WHERE created_at < v_cutoff RETURNING 1)
    SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('messages', v_count);

  -- private_messages
  IF p_dry_run THEN
    SELECT COUNT(*) INTO v_count FROM private_messages WHERE created_at < v_cutoff;
  ELSE
    WITH d AS (DELETE FROM private_messages WHERE created_at < v_cutoff RETURNING 1)
    SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('private_messages', v_count);

  -- security_rate_limits
  IF p_dry_run THEN
    SELECT COUNT(*) INTO v_count FROM security_rate_limits WHERE attempted_at < v_cutoff;
  ELSE
    WITH d AS (DELETE FROM security_rate_limits WHERE attempted_at < v_cutoff RETURNING 1)
    SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('security_rate_limits', v_count);

  -- notification_logs
  IF p_dry_run THEN
    SELECT COUNT(*) INTO v_count FROM notification_logs WHERE created_at < v_cutoff;
  ELSE
    WITH d AS (DELETE FROM notification_logs WHERE created_at < v_cutoff RETURNING 1)
    SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('notification_logs', v_count);

  -- admin_audit_logs
  IF p_dry_run THEN
    SELECT COUNT(*) INTO v_count FROM admin_audit_logs WHERE created_at < v_cutoff;
  ELSE
    WITH d AS (DELETE FROM admin_audit_logs WHERE created_at < v_cutoff RETURNING 1)
    SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('admin_audit_logs', v_count);

  -- live_reactions (>7d fixed)
  IF p_dry_run THEN
    SELECT COUNT(*) INTO v_count FROM live_reactions WHERE created_at < v_cutoff_short;
  ELSE
    WITH d AS (DELETE FROM live_reactions WHERE created_at < v_cutoff_short RETURNING 1)
    SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('live_reactions', v_count);

  -- typing_indicators (all expired)
  IF p_dry_run THEN
    SELECT COUNT(*) INTO v_count FROM typing_indicators WHERE expires_at < now();
  ELSE
    WITH d AS (DELETE FROM typing_indicators WHERE expires_at < now() RETURNING 1)
    SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('typing_indicators', v_count);

  -- pin_sessions invalidated > 30d
  IF p_dry_run THEN
    SELECT COUNT(*) INTO v_count FROM pin_sessions WHERE is_valid = false AND invalidated_at < v_cutoff_pin;
  ELSE
    WITH d AS (DELETE FROM pin_sessions WHERE is_valid = false AND invalidated_at < v_cutoff_pin RETURNING 1)
    SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('pin_sessions', v_count);

  -- broadcast_remote_sessions inactive > 30d
  IF p_dry_run THEN
    SELECT COUNT(*) INTO v_count FROM broadcast_remote_sessions WHERE is_active = false AND last_activity_at < v_cutoff_pin;
  ELSE
    WITH d AS (DELETE FROM broadcast_remote_sessions WHERE is_active = false AND last_activity_at < v_cutoff_pin RETURNING 1)
    SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('broadcast_remote_sessions', v_count);

  -- audit
  IF NOT p_dry_run THEN
    INSERT INTO admin_audit_logs (admin_user_id, action, target_type, details)
    VALUES (auth.uid(), 'db_cleanup_by_age', 'database',
      jsonb_build_object('days', p_days, 'result', v_result));
  END IF;

  RETURN jsonb_build_object('dry_run', p_dry_run, 'days', p_days, 'counts', v_result);
END;
$$;

-- 4. Cleanup ALL (destructive)
CREATE OR REPLACE FUNCTION public.admin_cleanup_all(p_confirm TEXT, p_dry_run BOOLEAN DEFAULT true)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSONB := '{}'::jsonb;
  v_count BIGINT;
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF NOT p_dry_run AND p_confirm <> 'CANCELLA TUTTO' THEN
    RAISE EXCEPTION 'Confirmation text required';
  END IF;

  -- Tables to fully wipe
  FOR v_count IN
    SELECT 0 -- placeholder loop init
  LOOP EXIT; END LOOP;

  -- chat_messages
  IF p_dry_run THEN SELECT COUNT(*) INTO v_count FROM chat_messages;
  ELSE WITH d AS (DELETE FROM chat_messages RETURNING 1) SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('chat_messages', v_count);

  IF p_dry_run THEN SELECT COUNT(*) INTO v_count FROM messages;
  ELSE WITH d AS (DELETE FROM messages RETURNING 1) SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('messages', v_count);

  IF p_dry_run THEN SELECT COUNT(*) INTO v_count FROM private_messages;
  ELSE WITH d AS (DELETE FROM private_messages RETURNING 1) SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('private_messages', v_count);

  IF p_dry_run THEN SELECT COUNT(*) INTO v_count FROM message_requests;
  ELSE WITH d AS (DELETE FROM message_requests RETURNING 1) SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('message_requests', v_count);

  IF p_dry_run THEN SELECT COUNT(*) INTO v_count FROM typing_indicators;
  ELSE WITH d AS (DELETE FROM typing_indicators RETURNING 1) SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('typing_indicators', v_count);

  IF p_dry_run THEN SELECT COUNT(*) INTO v_count FROM live_reactions;
  ELSE WITH d AS (DELETE FROM live_reactions RETURNING 1) SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('live_reactions', v_count);

  IF p_dry_run THEN SELECT COUNT(*) INTO v_count FROM notifications;
  ELSE WITH d AS (DELETE FROM notifications RETURNING 1) SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('notifications', v_count);

  IF p_dry_run THEN SELECT COUNT(*) INTO v_count FROM notification_logs;
  ELSE WITH d AS (DELETE FROM notification_logs RETURNING 1) SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('notification_logs', v_count);

  IF p_dry_run THEN SELECT COUNT(*) INTO v_count FROM security_rate_limits;
  ELSE WITH d AS (DELETE FROM security_rate_limits RETURNING 1) SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('security_rate_limits', v_count);

  IF p_dry_run THEN SELECT COUNT(*) INTO v_count FROM admin_audit_logs;
  ELSE WITH d AS (DELETE FROM admin_audit_logs RETURNING 1) SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('admin_audit_logs', v_count);

  IF p_dry_run THEN SELECT COUNT(*) INTO v_count FROM pin_sessions WHERE is_valid = false;
  ELSE WITH d AS (DELETE FROM pin_sessions WHERE is_valid = false RETURNING 1) SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('pin_sessions_invalid', v_count);

  IF p_dry_run THEN SELECT COUNT(*) INTO v_count FROM broadcast_remote_sessions WHERE is_active = false;
  ELSE WITH d AS (DELETE FROM broadcast_remote_sessions WHERE is_active = false RETURNING 1) SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('broadcast_remote_sessions_inactive', v_count);

  IF p_dry_run THEN SELECT COUNT(*) INTO v_count FROM post_likes;
  ELSE WITH d AS (DELETE FROM post_likes RETURNING 1) SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('post_likes', v_count);

  IF p_dry_run THEN SELECT COUNT(*) INTO v_count FROM post_comments;
  ELSE WITH d AS (DELETE FROM post_comments RETURNING 1) SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('post_comments', v_count);

  IF p_dry_run THEN SELECT COUNT(*) INTO v_count FROM posts;
  ELSE WITH d AS (DELETE FROM posts RETURNING 1) SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('posts', v_count);

  IF p_dry_run THEN SELECT COUNT(*) INTO v_count FROM performance_votes;
  ELSE WITH d AS (DELETE FROM performance_votes RETURNING 1) SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('performance_votes', v_count);

  IF p_dry_run THEN SELECT COUNT(*) INTO v_count FROM performance_vote_counts;
  ELSE WITH d AS (DELETE FROM performance_vote_counts RETURNING 1) SELECT COUNT(*) INTO v_count FROM d;
  END IF;
  v_result := v_result || jsonb_build_object('performance_vote_counts', v_count);

  -- audit
  IF NOT p_dry_run THEN
    INSERT INTO admin_audit_logs (admin_user_id, action, target_type, details)
    VALUES (auth.uid(), 'db_cleanup_all', 'database', jsonb_build_object('result', v_result));
  END IF;

  RETURN jsonb_build_object('dry_run', p_dry_run, 'counts', v_result);
END;
$$;

-- 5. Archive reservations
CREATE OR REPLACE FUNCTION public.admin_archive_reservations(p_before_date DATE, p_dry_run BOOLEAN DEFAULT true)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count BIGINT;
  v_batch UUID := gen_random_uuid();
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_dry_run THEN
    SELECT COUNT(*) INTO v_count FROM reservations
    WHERE created_at::date < p_before_date
      AND status IN ('completed', 'cancelled', 'skipped');
    RETURN jsonb_build_object('dry_run', true, 'would_archive', v_count, 'before_date', p_before_date);
  END IF;

  WITH moved AS (
    INSERT INTO reservations_archive (id, customer_name, song_title, song_artist, song_key, status, dedication_message, original_created_at, archive_batch_id, original_data)
    SELECT id, customer_name, song_title, song_artist, song_key, status, dedication_message, created_at, v_batch, to_jsonb(r.*)
    FROM reservations r
    WHERE created_at::date < p_before_date
      AND status IN ('completed', 'cancelled', 'skipped')
    RETURNING id
  ), del AS (
    DELETE FROM reservations WHERE id IN (SELECT id FROM moved) RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM del;

  INSERT INTO admin_audit_logs (admin_user_id, action, target_type, details)
  VALUES (auth.uid(), 'db_archive_reservations', 'reservations',
    jsonb_build_object('batch_id', v_batch, 'count', v_count, 'before_date', p_before_date));

  RETURN jsonb_build_object('dry_run', false, 'archived', v_count, 'batch_id', v_batch);
END;
$$;

-- 6. Restore last archive batch
CREATE OR REPLACE FUNCTION public.admin_restore_archive_batch(p_batch_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  WITH restored AS (
    INSERT INTO reservations
    SELECT (original_data ->> 'id')::uuid,
           original_data ->> 'customer_name',
           original_data ->> 'song_title',
           original_data ->> 'song_artist',
           original_data ->> 'song_key',
           original_data ->> 'status',
           original_data ->> 'dedication_message',
           (original_data ->> 'created_at')::timestamptz,
           COALESCE((original_data ->> 'updated_at')::timestamptz, now())
    FROM reservations_archive
    WHERE archive_batch_id = p_batch_id
      AND archived_at > now() - interval '24 hours'
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  ), del AS (
    DELETE FROM reservations_archive
    WHERE archive_batch_id = p_batch_id AND id IN (SELECT id FROM restored)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM del;

  RETURN jsonb_build_object('restored', v_count, 'batch_id', p_batch_id);
END;
$$;
