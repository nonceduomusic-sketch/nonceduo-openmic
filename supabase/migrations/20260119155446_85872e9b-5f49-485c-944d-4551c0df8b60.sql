-- SECURITY: Role-based access control and tighten reservations visibility

-- 1) Create roles enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END$$;

-- 2) Create user_roles table (NO FK to auth.users to avoid reserved-schema coupling)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3) Allow authenticated users to read their own roles (read-only)
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4) Helper function to check roles without recursive RLS issues
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- 5) Tighten reservations access: public INSERT only, admin-only SELECT/UPDATE/DELETE
-- Drop old public policies (idempotent)
DROP POLICY IF EXISTS "Anyone can view reservations" ON public.reservations;
DROP POLICY IF EXISTS "Anyone can update reservations" ON public.reservations;
DROP POLICY IF EXISTS "Anyone can delete reservations" ON public.reservations;

-- Keep INSERT policy as-is (public booking) - do not drop it

-- Admin-only read
DROP POLICY IF EXISTS "Admins can view reservations" ON public.reservations;
CREATE POLICY "Admins can view reservations"
ON public.reservations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin-only update
DROP POLICY IF EXISTS "Admins can update reservations" ON public.reservations;
CREATE POLICY "Admins can update reservations"
ON public.reservations
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin-only delete
DROP POLICY IF EXISTS "Admins can delete reservations" ON public.reservations;
CREATE POLICY "Admins can delete reservations"
ON public.reservations
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6) Defense-in-depth: basic length constraints for reservation fields (immutable checks)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservations_customer_name_len') THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_customer_name_len
      CHECK (length(trim(customer_name)) BETWEEN 2 AND 50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservations_song_title_len') THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_song_title_len
      CHECK (length(trim(song_title)) BETWEEN 1 AND 200);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservations_song_artist_len') THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_song_artist_len
      CHECK (length(trim(song_artist)) BETWEEN 1 AND 100);
  END IF;
END$$;

-- 7) Ensure admin_users has no public SELECT policy (idempotent)
DROP POLICY IF EXISTS "Anyone can read admin users" ON public.admin_users;
