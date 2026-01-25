-- ===========================================
-- FREE MODE SETTINGS TABLE
-- Controlli configurabili per eventi liberi
-- ===========================================

CREATE TABLE IF NOT EXISTS public.free_mode_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Format controls
  openmic_enabled boolean DEFAULT true,
  dediche_enabled boolean DEFAULT true,
  voting_enabled boolean DEFAULT true,
  
  -- Limits (null = no limit)
  openmic_max_songs integer DEFAULT NULL,
  dediche_max_total integer DEFAULT NULL,
  
  -- Time limits (null = no limit)
  duration_minutes integer DEFAULT NULL,
  started_at timestamp with time zone DEFAULT NULL,
  expires_at timestamp with time zone DEFAULT NULL,
  
  -- Current counts
  openmic_current_count integer DEFAULT 0,
  dediche_current_count integer DEFAULT 0,
  
  -- PIN protection
  pin_enabled boolean DEFAULT false,
  pin_code text DEFAULT NULL,
  
  -- Status
  is_active boolean DEFAULT false,
  
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.free_mode_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active free mode settings"
ON public.free_mode_settings FOR SELECT
USING (is_active = true);

CREATE POLICY "Staff can view all free mode settings"
ON public.free_mode_settings FOR SELECT
USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Owners and Admins can manage free mode settings"
ON public.free_mode_settings FOR ALL
USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Insert default row
INSERT INTO public.free_mode_settings (id) VALUES (gen_random_uuid());

-- ===========================================
-- ADD VOTING CONTROL TO EVENT_BOOKING_RULES
-- ===========================================

ALTER TABLE public.event_booking_rules 
ADD COLUMN IF NOT EXISTS voting_enabled boolean DEFAULT true;

-- ===========================================
-- ENABLE REALTIME
-- ===========================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.free_mode_settings;