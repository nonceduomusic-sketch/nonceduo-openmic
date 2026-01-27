-- 1. Create operator-specific permissions
INSERT INTO public.permissions (name, description) VALUES
  -- Operator section visibility
  ('operator.view_centro', 'Operatore può vedere il Centro Notifiche'),
  ('operator.view_openmic', 'Operatore può vedere la sezione Open Mic'),
  ('operator.view_dediche', 'Operatore può vedere la sezione Dediche'),
  -- Operator action levels
  ('operator.openmic_readonly', 'Operatore può solo visualizzare Open Mic'),
  ('operator.openmic_manage', 'Operatore può gestire la coda Open Mic (completare, riordinare)'),
  ('operator.dediche_readonly', 'Operatore può solo leggere le Dediche'),
  ('operator.dediche_manage', 'Operatore può rispondere alle Dediche')
ON CONFLICT (name) DO NOTHING;

-- 2. Assign default operator permissions to the 'operator' role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'operator'::app_role, id FROM public.permissions 
WHERE name IN (
  'operator.view_centro',
  'operator.view_openmic', 
  'operator.view_dediche',
  'operator.openmic_readonly',
  'operator.dediche_readonly'
)
ON CONFLICT DO NOTHING;

-- 3. Create helper function for operator role check
CREATE OR REPLACE FUNCTION public.is_operator(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'operator'::app_role
  )
$$;