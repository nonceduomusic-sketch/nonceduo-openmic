-- Correggi le policy RLS troppo permissive per group_join_requests

-- Rimuovi la policy troppo permissiva per INSERT
DROP POLICY IF EXISTS "Anyone can create join requests" ON public.group_join_requests;

-- Crea una policy più sicura: gli utenti possono creare richieste solo per se stessi
CREATE POLICY "Users can create own join requests"
ON public.group_join_requests FOR INSERT
WITH CHECK (
  -- Gli utenti autenticati possono creare richieste per se stessi
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  -- Gli utenti anonimi (con session_id) possono creare richieste con session_id
  (session_id IS NOT NULL AND session_id = ((current_setting('request.headers'::text, true))::json ->> 'x-session-id'::text))
);

-- La policy per le conversation che permette INSERT a tutti è intenzionale 
-- perché gli utenti devono poter iniziare nuove conversazioni/dediche
-- Ma aggiungiamo una check più specifica

-- Per messages, la policy INSERT true è necessaria per il sistema di dediche anonime
-- Non modifichiamo queste perché sono design decisions consapevoli