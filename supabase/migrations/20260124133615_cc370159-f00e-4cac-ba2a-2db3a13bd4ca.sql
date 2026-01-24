-- Table to store push notification subscriptions for admin devices
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_type TEXT NOT NULL DEFAULT 'admin', -- 'admin' or 'user'
  user_identifier TEXT, -- admin username or user session id
  device_info JSONB, -- browser, os, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX idx_push_subscriptions_user_type ON public.push_subscriptions(user_type);
CREATE INDEX idx_push_subscriptions_user_identifier ON public.push_subscriptions(user_identifier);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (registration happens before auth)
CREATE POLICY "Allow insert push subscriptions" 
ON public.push_subscriptions 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to update their own subscription
CREATE POLICY "Allow update push subscriptions" 
ON public.push_subscriptions 
FOR UPDATE 
USING (true);

-- Allow reading all admin subscriptions (for sending notifications)
CREATE POLICY "Allow read push subscriptions" 
ON public.push_subscriptions 
FOR SELECT 
USING (true);

-- Allow delete
CREATE POLICY "Allow delete push subscriptions" 
ON public.push_subscriptions 
FOR DELETE 
USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions;