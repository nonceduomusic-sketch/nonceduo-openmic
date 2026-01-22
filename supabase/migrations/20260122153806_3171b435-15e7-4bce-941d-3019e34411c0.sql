-- Fix admin-panel visibility for Open Mic reservations for Owner/Admin/Moderator.
-- Reservations contain PII (customer_name) so access remains staff-only.

-- Reservations: SELECT
DROP POLICY IF EXISTS "Admins can view reservations" ON public.reservations;
CREATE POLICY "Staff can view reservations"
ON public.reservations
FOR SELECT
USING (
  is_owner(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- Reservations: UPDATE
DROP POLICY IF EXISTS "Admins can update reservations" ON public.reservations;
CREATE POLICY "Staff can update reservations"
ON public.reservations
FOR UPDATE
USING (
  is_owner(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  is_owner(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- Reservations: DELETE
DROP POLICY IF EXISTS "Admins can delete reservations" ON public.reservations;
CREATE POLICY "Staff can delete reservations"
ON public.reservations
FOR DELETE
USING (
  is_owner(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- Reservation statuses: staff management (keep public SELECT policy already present)
DROP POLICY IF EXISTS "Admins can manage reservation statuses" ON public.reservation_statuses;
CREATE POLICY "Staff can manage reservation statuses"
ON public.reservation_statuses
FOR ALL
USING (
  is_owner(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  is_owner(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Admins can view reservation statuses" ON public.reservation_statuses;
CREATE POLICY "Staff can view reservation statuses"
ON public.reservation_statuses
FOR SELECT
USING (
  is_owner(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);
