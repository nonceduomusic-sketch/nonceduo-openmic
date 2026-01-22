-- Harden sync_reservation_status: rely on SECURITY DEFINER scope only (avoid disabling RLS for whole transaction)
CREATE OR REPLACE FUNCTION public.sync_reservation_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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