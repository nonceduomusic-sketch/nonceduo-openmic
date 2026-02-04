-- Add TV display settings to broadcast_sessions
ALTER TABLE public.broadcast_sessions
ADD COLUMN IF NOT EXISTS tv_title TEXT DEFAULT 'Open Mic',
ADD COLUMN IF NOT EXISTS tv_subtitle TEXT DEFAULT 'NonceDuo Live Experience',
ADD COLUMN IF NOT EXISTS tv_footer TEXT DEFAULT 'Powered by NonceDuo',
ADD COLUMN IF NOT EXISTS tv_qr_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tv_logo_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tv_show_qr BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS tv_show_logo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS tv_show_title BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS tv_show_subtitle BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS tv_show_footer BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS tv_show_status BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS tv_qr_cta TEXT DEFAULT 'Scansiona per prenotare la tua canzone',
ADD COLUMN IF NOT EXISTS tv_element_positions JSONB DEFAULT '{"logo": {"x": 50, "y": 15}, "title": {"x": 50, "y": 35}, "subtitle": {"x": 50, "y": 42}, "status": {"x": 50, "y": 52}, "qr": {"x": 50, "y": 72}, "qr_cta": {"x": 50, "y": 88}, "footer": {"x": 50, "y": 96}}'::jsonb;