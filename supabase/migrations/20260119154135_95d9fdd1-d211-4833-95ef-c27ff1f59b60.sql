-- SECURITY FIX: Remove public access to admin_users table
-- The edge function uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS,
-- so this public policy is unnecessary and dangerous (exposes password hashes)
DROP POLICY IF EXISTS "Anyone can read admin users" ON public.admin_users;

-- SECURITY FIX: Remove public UPDATE/DELETE access to reservations
-- These operations should only be done by admins via edge functions
DROP POLICY IF EXISTS "Anyone can update reservations" ON public.reservations;
DROP POLICY IF EXISTS "Anyone can delete reservations" ON public.reservations;

-- Keep public INSERT for booking form (users need to create reservations)
-- Keep public SELECT for realtime updates in admin dashboard
-- The admin dashboard will use edge functions for UPDATE/DELETE operations