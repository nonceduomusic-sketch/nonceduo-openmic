
-- Table for notification settings (global and per-type flags)
CREATE TABLE public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Global toggles
  telegram_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  -- Open Mic specific
  openmic_telegram_enabled boolean NOT NULL DEFAULT true,
  openmic_email_enabled boolean NOT NULL DEFAULT true,
  -- Dediche specific
  dediche_telegram_enabled boolean NOT NULL DEFAULT true,
  dediche_email_enabled boolean NOT NULL DEFAULT true,
  -- Email recipient
  email_recipient text NOT NULL DEFAULT 'nonceduo.music@gmail.com',
  -- Telegram chat IDs
  telegram_openmic_chat_id text NOT NULL DEFAULT '-3786094525',
  telegram_dediche_chat_id text NOT NULL DEFAULT '-3879316870',
  -- Metadata
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert default settings row
INSERT INTO public.notification_settings (id) VALUES (gen_random_uuid());

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed for edge function)
CREATE POLICY "Anyone can read notification settings"
ON public.notification_settings FOR SELECT
USING (true);

-- Only owners/admins can update
CREATE POLICY "Staff can update notification settings"
ON public.notification_settings FOR UPDATE
USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Table for notification logs (history/debug)
CREATE TABLE public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL, -- 'openmic' or 'dediche'
  channel text NOT NULL, -- 'email' or 'telegram'
  recipient text NOT NULL, -- email address or chat_id
  subject text,
  message_body text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message text,
  reservation_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Staff can view logs
CREATE POLICY "Staff can view notification logs"
ON public.notification_logs FOR SELECT
USING (
  is_owner(auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);

-- System can insert logs (via service role)
CREATE POLICY "System can insert notification logs"
ON public.notification_logs FOR INSERT
WITH CHECK (true);

-- Create index for faster log queries
CREATE INDEX idx_notification_logs_created_at ON public.notification_logs(created_at DESC);
CREATE INDEX idx_notification_logs_type_channel ON public.notification_logs(notification_type, channel);
