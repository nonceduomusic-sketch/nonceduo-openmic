
-- Add policy for staff to view all user roles (needed to list operators)
CREATE POLICY "Staff can view all roles"
ON public.user_roles
FOR SELECT
USING (
  is_owner(auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);
