-- Fix: Add operator role to notification_logs SELECT policy
DROP POLICY IF EXISTS "Staff can view notification logs" ON public.notification_logs;

CREATE POLICY "Staff and operators can view notification logs"
ON public.notification_logs
FOR SELECT
USING (
  is_owner(auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR has_role(auth.uid(), 'operator'::app_role)
);