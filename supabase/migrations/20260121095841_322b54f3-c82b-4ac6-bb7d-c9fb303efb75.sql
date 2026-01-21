-- 1) Helpers: normalize song text (apostrophes + case + trim)
CREATE OR REPLACE FUNCTION public.normalize_song_text(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(btrim(regexp_replace(coalesce(t, ''), '[''''`´]', '''', 'g')))
$$;

-- 2) Add a deterministic key to reservations (prevents duplicates even with different apostrophes)
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS song_key text
GENERATED ALWAYS AS (
  public.normalize_song_text(song_title) || '__' || public.normalize_song_text(song_artist)
) STORED;

-- 3) Enforce: only one active (in_progress) reservation per song
CREATE UNIQUE INDEX IF NOT EXISTS reservations_unique_active_song
  ON public.reservations (song_key)
  WHERE status = 'in_progress';

-- 4) Public, non-PII status table for realtime UI updates
CREATE TABLE IF NOT EXISTS public.reservation_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL UNIQUE REFERENCES public.reservations(id) ON DELETE CASCADE,
  song_title text NOT NULL,
  song_artist text NOT NULL,
  song_key text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reservation_statuses_song_key_idx
  ON public.reservation_statuses(song_key);

CREATE INDEX IF NOT EXISTS reservation_statuses_status_idx
  ON public.reservation_statuses(status);

-- 5) RLS: anyone can read statuses (no names), only admins can manage
ALTER TABLE public.reservation_statuses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reservation_statuses'
      AND policyname = 'Anyone can view reservation statuses'
  ) THEN
    CREATE POLICY "Anyone can view reservation statuses"
      ON public.reservation_statuses
      FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reservation_statuses'
      AND policyname = 'Admins can manage reservation statuses'
  ) THEN
    CREATE POLICY "Admins can manage reservation statuses"
      ON public.reservation_statuses
      FOR ALL
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- 6) Sync trigger from reservations -> reservation_statuses (runs as definer, bypasses RLS)
CREATE OR REPLACE FUNCTION public.sync_reservation_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ensure this trigger can write regardless of caller RLS
  PERFORM set_config('row_security', 'off', true);

  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.reservation_statuses
    WHERE reservation_id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.reservation_statuses (
    reservation_id,
    song_title,
    song_artist,
    song_key,
    status,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.song_title,
    NEW.song_artist,
    NEW.song_key,
    NEW.status,
    NEW.created_at,
    now()
  )
  ON CONFLICT (reservation_id)
  DO UPDATE SET
    song_title = EXCLUDED.song_title,
    song_artist = EXCLUDED.song_artist,
    song_key = EXCLUDED.song_key,
    status = EXCLUDED.status,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservations_sync_status ON public.reservations;
CREATE TRIGGER trg_reservations_sync_status
AFTER INSERT OR UPDATE OR DELETE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.sync_reservation_status();

-- 7) Backfill statuses for existing rows
INSERT INTO public.reservation_statuses (reservation_id, song_title, song_artist, song_key, status, created_at, updated_at)
SELECT r.id, r.song_title, r.song_artist, r.song_key, r.status, r.created_at, now()
FROM public.reservations r
ON CONFLICT (reservation_id)
DO UPDATE SET
  song_title = EXCLUDED.song_title,
  song_artist = EXCLUDED.song_artist,
  song_key = EXCLUDED.song_key,
  status = EXCLUDED.status,
  updated_at = now();

-- 8) Realtime publication (ignore if already added)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reservation_statuses;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;