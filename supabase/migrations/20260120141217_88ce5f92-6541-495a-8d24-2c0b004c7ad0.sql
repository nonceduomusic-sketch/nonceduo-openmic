-- Fix PUBLIC_USER_DATA: Restrict messages table SELECT to admins only
-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Anyone can view messages" ON public.messages;

-- Create admin-only SELECT policy
CREATE POLICY "Admins can view messages" 
ON public.messages 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix EXPOSED_SENSITIVE_DATA: Protect admin_users table with RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Deny all direct access to admin_users table (edge functions use service role)
CREATE POLICY "No direct access to admin_users"
ON public.admin_users
FOR ALL
USING (false);

-- Also protect password_reset_tokens table
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to password_reset_tokens"
ON public.password_reset_tokens
FOR ALL
USING (false);