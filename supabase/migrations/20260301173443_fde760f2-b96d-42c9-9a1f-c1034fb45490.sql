-- Add unique constraint on filename to prevent duplicate uploads
-- First, remove any existing duplicates (keep the most recent one)
DELETE FROM public.songbook_files a
USING public.songbook_files b
WHERE a.id < b.id AND a.filename = b.filename;

-- Now add the unique index
CREATE UNIQUE INDEX IF NOT EXISTS songbook_files_filename_unique ON public.songbook_files (filename);