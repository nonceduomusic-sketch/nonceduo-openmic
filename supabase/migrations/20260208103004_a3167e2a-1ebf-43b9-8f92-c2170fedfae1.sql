-- Add font_size, text_align and remote_scroll_enabled to broadcast_sessions
ALTER TABLE public.broadcast_sessions 
ADD COLUMN IF NOT EXISTS font_size integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS text_align text DEFAULT 'center',
ADD COLUMN IF NOT EXISTS remote_scroll_enabled boolean DEFAULT true;

-- Add constraint for text_align values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'broadcast_sessions_text_align_check'
  ) THEN
    ALTER TABLE public.broadcast_sessions 
    ADD CONSTRAINT broadcast_sessions_text_align_check 
    CHECK (text_align IN ('left', 'center', 'right'));
  END IF;
END
$$;