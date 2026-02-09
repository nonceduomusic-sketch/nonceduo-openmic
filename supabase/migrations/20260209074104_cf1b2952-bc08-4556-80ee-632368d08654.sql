-- =============================================
-- SONGBOOK SYSTEM - Phase 1: Files & Catalog
-- =============================================

-- Table for storing ChordPro (.cho) files metadata
CREATE TABLE public.songbook_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  content TEXT NOT NULL, -- The raw ChordPro content
  filename TEXT NOT NULL,
  slug TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- For duplicate handling: files ending with _ go to bottom
  is_variant BOOLEAN DEFAULT false
);

-- Create slug generation function for songbook
CREATE OR REPLACE FUNCTION public.generate_songbook_slug()
RETURNS TRIGGER AS $$
BEGIN
  NEW.slug := LOWER(REGEXP_REPLACE(REGEXP_REPLACE(
    COALESCE(NEW.title, '') || '-' || COALESCE(NEW.artist, ''), 
    '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
  NEW.updated_at := now();
  -- Check if filename ends with _ (variant)
  NEW.is_variant := (NEW.filename LIKE '%\_%' OR NEW.filename LIKE '%\_%.cho');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for slug generation
CREATE TRIGGER generate_songbook_slug_trigger
BEFORE INSERT OR UPDATE ON public.songbook_files
FOR EACH ROW EXECUTE FUNCTION public.generate_songbook_slug();

-- Enable RLS
ALTER TABLE public.songbook_files ENABLE ROW LEVEL SECURITY;

-- Anyone can view songbook files (for TV display)
CREATE POLICY "Anyone can view songbook files"
ON public.songbook_files FOR SELECT
USING (true);

-- Staff can manage songbook files
CREATE POLICY "Staff can manage songbook files"
ON public.songbook_files FOR ALL
USING (
  is_owner(auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role) OR
  (is_operator(auth.uid()) AND has_permission(auth.uid(), 'operator.trasmetti_full'))
)
WITH CHECK (
  is_owner(auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role) OR
  (is_operator(auth.uid()) AND has_permission(auth.uid(), 'operator.trasmetti_full'))
);

-- Enable realtime for songbook_files
ALTER PUBLICATION supabase_realtime ADD TABLE public.songbook_files;

-- =============================================
-- SONGBOOK SETLISTS (Separate from broadcast_setlists)
-- =============================================

CREATE TABLE public.songbook_setlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.songbook_setlists ENABLE ROW LEVEL SECURITY;

-- Staff can view setlists
CREATE POLICY "Staff can view songbook setlists"
ON public.songbook_setlists FOR SELECT
USING (
  created_by = auth.uid() OR
  is_owner(auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role) OR
  (is_operator(auth.uid()) AND has_permission(auth.uid(), 'operator.trasmetti_view'))
);

-- Staff can manage setlists
CREATE POLICY "Staff can manage songbook setlists"
ON public.songbook_setlists FOR ALL
USING (
  created_by = auth.uid() OR
  is_owner(auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  (is_operator(auth.uid()) AND has_permission(auth.uid(), 'operator.trasmetti_full'))
);

-- Songs in setlist
CREATE TABLE public.songbook_setlist_songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setlist_id UUID NOT NULL REFERENCES public.songbook_setlists(id) ON DELETE CASCADE,
  songbook_file_id UUID NOT NULL REFERENCES public.songbook_files(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.songbook_setlist_songs ENABLE ROW LEVEL SECURITY;

-- Staff can view setlist songs
CREATE POLICY "Staff can view songbook setlist songs"
ON public.songbook_setlist_songs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.songbook_setlists s 
    WHERE s.id = setlist_id 
    AND (s.created_by = auth.uid() OR is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  )
);

-- Staff can manage setlist songs
CREATE POLICY "Staff can manage songbook setlist songs"
ON public.songbook_setlist_songs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.songbook_setlists s 
    WHERE s.id = setlist_id 
    AND (s.created_by = auth.uid() OR is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- =============================================
-- SONGBOOK BROADCAST SESSION FIELDS
-- =============================================

-- Add songbook-specific fields to broadcast_sessions
ALTER TABLE public.broadcast_sessions 
ADD COLUMN IF NOT EXISTS songbook_file_id UUID REFERENCES public.songbook_files(id),
ADD COLUMN IF NOT EXISTS songbook_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS songbook_show_chords_on_tv BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS songbook_transpose INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS songbook_view_mode TEXT DEFAULT 'chordpro'; -- 'compact', 'karaoke', 'spotify', 'chordpro'

-- Enable realtime for songbook setlists
ALTER PUBLICATION supabase_realtime ADD TABLE public.songbook_setlists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.songbook_setlist_songs;