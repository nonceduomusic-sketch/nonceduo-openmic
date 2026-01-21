-- Add message status tracking for WhatsApp-style checkmarks
-- 'sent' = message sent (single gray check)
-- 'delivered' = message delivered to conversation (double gray check)  
-- 'read' = message read by recipient (double blue check)
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read'));

-- Add read_at timestamp to track when message was read
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Create typing_indicators table for real-time typing status
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 seconds')
);

-- Enable RLS
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read typing indicators
CREATE POLICY "Anyone can read typing indicators" 
ON public.typing_indicators 
FOR SELECT 
USING (true);

-- Allow users to insert/update their own typing indicators
CREATE POLICY "Users can manage their own typing indicators" 
ON public.typing_indicators 
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation 
ON public.typing_indicators(conversation_id);

-- Enable realtime for typing indicators
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;

-- Function to clean up expired typing indicators (run periodically or on read)
CREATE OR REPLACE FUNCTION public.cleanup_expired_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM public.typing_indicators WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SET search_path = public;