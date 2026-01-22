-- Aggiungi permessi granulari per sezioni specifiche
-- Questo permette all'Owner di definire cosa ogni admin/moderatore può fare

-- Aggiungi nuovi permessi per le tre sezioni principali
INSERT INTO public.permissions (name, description) VALUES
-- Open Mic permissions
('openmic.view', 'Può vedere le prenotazioni Open Mic'),
('openmic.manage', 'Può gestire le prenotazioni (completa, riattiva)'),
('openmic.delete', 'Può eliminare prenotazioni'),
('openmic.reset', 'Può resettare le prenotazioni'),

-- Dediche permissions
('dediche.view', 'Può vedere i messaggi delle dediche'),
('dediche.manage', 'Può gestire i gruppi dediche (creare, rinominare)'),
('dediche.moderate', 'Può moderare i messaggi dediche'),
('dediche.delete', 'Può eliminare messaggi e gruppi dediche'),

-- Community permissions  
('community.view', 'Può vedere la community'),
('community.manage_groups', 'Può gestire i gruppi (creare, modificare, eliminare)'),
('community.manage_users', 'Può gestire gli utenti (bloccare, sbloccare)'),
('community.moderate', 'Può moderare post e commenti'),
('community.delete', 'Può eliminare contenuti community'),
('community.reset', 'Può resettare la community'),
('community.approve_join', 'Può approvare richieste di ingresso ai gruppi'),

-- General admin permissions
('users.view', 'Può vedere la lista utenti'),
('users.edit', 'Può modificare profili utenti'),
('users.delete', 'Può eliminare profili utenti'),
('users.reset_password', 'Può inviare reset password'),

-- Settings permissions
('settings.view', 'Può vedere le impostazioni'),
('settings.edit', 'Può modificare le impostazioni'),
('settings.rename_sections', 'Può rinominare le sezioni (Open Mic, Dediche, Community)')
ON CONFLICT (name) DO NOTHING;

-- Aggiungi permessi ai ruoli esistenti
-- Owner ha tutti i permessi (gestito via is_owner function)
-- Admin ha la maggior parte dei permessi
-- Moderator ha permessi limitati

-- Admin permissions (tutto tranne reset globali e gestione staff)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin'::app_role, p.id 
FROM public.permissions p
WHERE p.name IN (
  'openmic.view', 'openmic.manage', 'openmic.delete', 'openmic.reset',
  'dediche.view', 'dediche.manage', 'dediche.moderate', 'dediche.delete',
  'community.view', 'community.manage_groups', 'community.manage_users', 
  'community.moderate', 'community.delete', 'community.approve_join',
  'users.view', 'users.edit', 'users.reset_password',
  'settings.view'
)
ON CONFLICT DO NOTHING;

-- Moderator permissions (solo visualizzazione e moderazione base)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'moderator'::app_role, p.id 
FROM public.permissions p
WHERE p.name IN (
  'openmic.view', 'openmic.manage',
  'dediche.view', 'dediche.moderate',
  'community.view', 'community.moderate', 'community.approve_join',
  'users.view'
)
ON CONFLICT DO NOTHING;

-- Crea tabella per le impostazioni delle sezioni (nomi personalizzabili)
CREATE TABLE IF NOT EXISTS public.section_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  is_enabled boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Abilita RLS
ALTER TABLE public.section_settings ENABLE ROW LEVEL SECURITY;

-- Policy: tutti possono leggere le impostazioni
CREATE POLICY "Anyone can view section settings"
ON public.section_settings FOR SELECT
USING (true);

-- Policy: solo owner e admin con permesso possono modificare
CREATE POLICY "Owners and authorized admins can update section settings"
ON public.section_settings FOR UPDATE
USING (is_owner(auth.uid()) OR has_permission(auth.uid(), 'settings.rename_sections'));

-- Inserisci le sezioni predefinite
INSERT INTO public.section_settings (section_key, display_name, description) VALUES
('openmic', 'Open Mic', 'Serata karaoke con prenotazioni canzoni'),
('dediche', 'Dediche', 'Messaggi e dediche durante gli eventi'),
('community', 'Community', 'Social network per gli utenti')
ON CONFLICT (section_key) DO NOTHING;

-- Crea tabella per le richieste di approvazione gruppi
CREATE TABLE IF NOT EXISTS public.group_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  session_id text,
  requester_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES auth.users(id)
);

-- Abilita RLS
ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;

-- Policy: gli admin possono vedere tutte le richieste
CREATE POLICY "Admins can view all join requests"
ON public.group_join_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Policy: gli utenti possono vedere le proprie richieste
CREATE POLICY "Users can view own join requests"
ON public.group_join_requests FOR SELECT
USING (user_id = auth.uid() OR session_id = ((current_setting('request.headers'::text, true))::json ->> 'x-session-id'::text));

-- Policy: chiunque può creare richieste
CREATE POLICY "Anyone can create join requests"
ON public.group_join_requests FOR INSERT
WITH CHECK (true);

-- Policy: admin/mod possono aggiornare le richieste
CREATE POLICY "Admins can update join requests"
ON public.group_join_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Aggiungi colonna per gruppi che richiedono approvazione
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT false;

-- Abilita realtime per le nuove tabelle
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_join_requests;