-- Enable realtime for permission-related tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_permissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.role_permissions;