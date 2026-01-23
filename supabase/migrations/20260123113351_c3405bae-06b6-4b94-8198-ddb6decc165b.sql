-- Drop the existing check constraint that's blocking 'global' section
ALTER TABLE public.live_sessions DROP CONSTRAINT IF EXISTS live_sessions_section_check;

-- Add new check constraint that allows 'global', 'openmic', and 'dediche'
ALTER TABLE public.live_sessions 
ADD CONSTRAINT live_sessions_section_check 
CHECK (section IN ('global', 'openmic', 'dediche'));

-- Add new permissions for Centro management (owner-only by default)
INSERT INTO public.permissions (name, description)
VALUES 
  ('centro.monitor_formats', 'Accesso ai toggle per monitorare i format in Centro'),
  ('centro.active_formats', 'Accesso ai toggle per attivare/disattivare i format globalmente'),
  ('centro.serata_live', 'Accesso alla gestione Serata Live con PIN/QR')
ON CONFLICT (name) DO NOTHING;

-- Create table for global format settings (which formats are publicly active)
CREATE TABLE IF NOT EXISTS public.global_format_settings (
  format_key TEXT PRIMARY KEY,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default format settings
INSERT INTO public.global_format_settings (format_key, is_active)
VALUES 
  ('openmic', true),
  ('dediche', true),
  ('community', true)
ON CONFLICT (format_key) DO NOTHING;

-- Enable RLS on global_format_settings
ALTER TABLE public.global_format_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view format settings
CREATE POLICY "Anyone can view global format settings"
ON public.global_format_settings FOR SELECT
USING (true);

-- Only owners and users with centro.active_formats permission can update
CREATE POLICY "Authorized users can update global format settings"
ON public.global_format_settings FOR UPDATE
USING (
  is_owner(auth.uid()) OR 
  has_permission(auth.uid(), 'centro.active_formats')
)
WITH CHECK (
  is_owner(auth.uid()) OR 
  has_permission(auth.uid(), 'centro.active_formats')
);

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_format_settings;