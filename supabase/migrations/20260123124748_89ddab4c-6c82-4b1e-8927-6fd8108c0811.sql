-- Fix overly permissive INSERT policy on notifications
-- The trigger functions are SECURITY DEFINER so they bypass RLS anyway
-- But for direct inserts, we should restrict to authenticated users only
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Only authenticated users can create notifications (triggers bypass RLS)
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);