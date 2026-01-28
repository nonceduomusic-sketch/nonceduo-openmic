-- Allow Operators to SEE and (when granted) MANAGE Open Mic + Dediche in the admin panel
-- (fixes “Operatore vede tutto vuoto” due to RLS blocking SELECT on key tables)

BEGIN;

/* =========================
   RESERVATIONS (Open Mic)
   ========================= */

DROP POLICY IF EXISTS "Operators can view reservations" ON public.reservations;
CREATE POLICY "Operators can view reservations"
ON public.reservations
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'operator'::app_role)
  AND has_permission(auth.uid(), 'operator.view_openmic')
);

DROP POLICY IF EXISTS "Operators can manage reservations" ON public.reservations;
CREATE POLICY "Operators can manage reservations"
ON public.reservations
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'operator'::app_role)
  AND has_permission(auth.uid(), 'operator.openmic_manage')
)
WITH CHECK (
  has_role(auth.uid(), 'operator'::app_role)
  AND has_permission(auth.uid(), 'operator.openmic_manage')
);

/* =========================
   CONVERSATIONS (Dediche)
   ========================= */

DROP POLICY IF EXISTS "Operators can view dediche conversations" ON public.conversations;
CREATE POLICY "Operators can view dediche conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  section = 'dediche'
  AND has_role(auth.uid(), 'operator'::app_role)
  AND has_permission(auth.uid(), 'operator.view_dediche')
);

/* =========================
   CHAT_MESSAGES (Dediche)
   ========================= */

DROP POLICY IF EXISTS "Operators can view dediche chat messages" ON public.chat_messages;
CREATE POLICY "Operators can view dediche chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'operator'::app_role)
  AND has_permission(auth.uid(), 'operator.view_dediche')
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = chat_messages.conversation_id
      AND c.section = 'dediche'
  )
);

COMMIT;
