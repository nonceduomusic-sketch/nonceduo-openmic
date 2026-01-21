-- 1. Create permissions table for granular control
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default permissions
INSERT INTO public.permissions (name, description) VALUES
  ('manage_owners', 'Può gestire i proprietari (solo owner)'),
  ('manage_admins', 'Può aggiungere/rimuovere admin'),
  ('manage_moderators', 'Può aggiungere/rimuovere moderatori'),
  ('manage_users', 'Può gestire gli utenti registrati'),
  ('block_users', 'Può bloccare/sbloccare utenti'),
  ('manage_groups', 'Può creare/modificare/eliminare gruppi'),
  ('manage_passwords', 'Può impostare password sui gruppi'),
  ('send_messages', 'Può inviare messaggi come admin'),
  ('delete_messages', 'Può eliminare messaggi'),
  ('view_all_conversations', 'Può vedere tutte le conversazioni'),
  ('manage_reservations', 'Può gestire le prenotazioni karaoke'),
  ('manage_songs', 'Può gestire il catalogo canzoni'),
  ('view_analytics', 'Può visualizzare statistiche e analytics'),
  ('manage_invite_links', 'Può creare/revocare link di invito');

-- 2. Create role_permissions to define default permissions per role
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id uuid REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- 3. Create user_permissions for granular overrides (add/remove specific permissions)
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  permission_id uuid REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission_id)
);

-- 4. Assign default permissions to roles
-- Owner gets everything
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'owner'::app_role, id FROM public.permissions;

-- Admin gets most things except manage_owners
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin'::app_role, id FROM public.permissions 
WHERE name NOT IN ('manage_owners');

-- Moderator gets limited permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'moderator'::app_role, id FROM public.permissions 
WHERE name IN ('block_users', 'send_messages', 'delete_messages', 'view_all_conversations', 'manage_groups');

-- 5. Create helper function to check if user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = _user_id 
      AND p.name = _permission_name 
      AND up.granted = true
  )
  OR (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role = ur.role
      JOIN public.permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = _user_id 
        AND p.name = _permission_name
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_permissions up
      JOIN public.permissions p ON p.id = up.permission_id
      WHERE up.user_id = _user_id 
        AND p.name = _permission_name 
        AND up.granted = false
    )
  )
$$;

-- 6. Create function to check if user is owner
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'owner'::app_role
  )
$$;

-- 7. Enable RLS on new tables
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for permissions table (read-only for authenticated)
CREATE POLICY "Authenticated users can view permissions"
ON public.permissions FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 9. RLS Policies for role_permissions
CREATE POLICY "Authenticated users can view role permissions"
ON public.role_permissions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owners can manage role permissions"
ON public.role_permissions FOR ALL
USING (is_owner(auth.uid()))
WITH CHECK (is_owner(auth.uid()));

-- 10. RLS Policies for user_permissions
CREATE POLICY "Users can view permissions they can manage"
ON public.user_permissions FOR SELECT
USING (user_id = auth.uid() OR is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners and admins can insert user permissions"
ON public.user_permissions FOR INSERT
WITH CHECK (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners and admins can update user permissions"
ON public.user_permissions FOR UPDATE
USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners and admins can delete user permissions"
ON public.user_permissions FOR DELETE
USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- 11. Fix typing_indicators RLS warnings (replace true with proper checks)
DROP POLICY IF EXISTS "Users can update own typing indicators" ON public.typing_indicators;
CREATE POLICY "Users can update own typing indicators"
ON public.typing_indicators FOR UPDATE
USING (session_id = (current_setting('request.headers'::text, true))::json ->> 'x-session-id')
WITH CHECK (session_id = (current_setting('request.headers'::text, true))::json ->> 'x-session-id');

DROP POLICY IF EXISTS "Users can delete own typing indicators" ON public.typing_indicators;
CREATE POLICY "Users can delete own typing indicators"
ON public.typing_indicators FOR DELETE
USING (session_id = (current_setting('request.headers'::text, true))::json ->> 'x-session-id');