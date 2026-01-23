-- Step 1: Ensure OWNER has ALL permissions (full access)
-- The owner should have every single permission in the system

-- First, get all permission IDs and insert them for owner role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'owner'::app_role, p.id
FROM public.permissions p
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp 
  WHERE rp.role = 'owner'::app_role AND rp.permission_id = p.id
);

-- Step 2: Ensure moderator has essential view permissions for assigned sections
-- Moderator should at least be able to VIEW community (they already have openmic.view and dediche.view)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'moderator'::app_role, p.id
FROM public.permissions p
WHERE p.name IN ('community.view', 'settings.view', 'openmic.manage')
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp 
  WHERE rp.role = 'moderator'::app_role AND rp.permission_id = p.id
);

-- Step 3: Add missing admin permissions (ensure admin has settings.edit, settings.rename_sections)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin'::app_role, p.id
FROM public.permissions p
WHERE p.name IN ('settings.edit', 'settings.rename_sections', 'community.view', 'community.manage_groups', 'community.manage_users', 'community.moderate', 'community.delete', 'community.reset', 'community.approve_join')
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp 
  WHERE rp.role = 'admin'::app_role AND rp.permission_id = p.id
);