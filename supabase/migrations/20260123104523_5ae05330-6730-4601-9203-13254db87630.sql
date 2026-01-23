-- Create table for live session PINs
CREATE TABLE public.live_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section TEXT NOT NULL CHECK (section IN ('openmic', 'dediche')),
  pin_code TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  deactivated_at TIMESTAMP WITH TIME ZONE,
  deactivated_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_active_session_per_section UNIQUE (section, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Enable RLS
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Only owners can manage live sessions
CREATE POLICY "Owners can manage live sessions"
ON public.live_sessions
FOR ALL
USING (is_owner(auth.uid()))
WITH CHECK (is_owner(auth.uid()));

-- Policy: Staff can view live sessions
CREATE POLICY "Staff can view live sessions"
ON public.live_sessions
FOR SELECT
USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Policy: Anyone can check if a PIN is valid (for reservation validation)
CREATE POLICY "Anyone can validate active PINs"
ON public.live_sessions
FOR SELECT
USING (is_active = true);

-- Create function to validate PIN
CREATE OR REPLACE FUNCTION public.validate_live_session_pin(
  p_section TEXT,
  p_pin TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.live_sessions
    WHERE section = p_section
      AND pin_code = UPPER(TRIM(p_pin))
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$;

-- Create function to check if live session is active for a section
CREATE OR REPLACE FUNCTION public.is_live_session_active(p_section TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.live_sessions
    WHERE section = p_section
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$;

-- Enable realtime for live_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;