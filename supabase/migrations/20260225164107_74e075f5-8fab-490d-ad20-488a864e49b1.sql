
CREATE TABLE public.furore_remote_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  access_token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  pin_code TEXT NOT NULL DEFAULT upper(substring(encode(extensions.gen_random_bytes(3), 'hex') from 1 for 6)),
  pin_required BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  name TEXT NOT NULL DEFAULT 'Telecomando Furore',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  last_used_at TIMESTAMPTZ
);

ALTER TABLE public.furore_remote_access ENABLE ROW LEVEL SECURITY;

-- Anyone can read active tokens (needed for validation)
CREATE POLICY "Anyone can validate active furore remote tokens"
  ON public.furore_remote_access
  FOR SELECT
  USING (is_active = true);

-- Staff can manage
CREATE POLICY "Staff can manage furore remote access"
  ON public.furore_remote_access
  FOR ALL
  USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.furore_remote_access;
