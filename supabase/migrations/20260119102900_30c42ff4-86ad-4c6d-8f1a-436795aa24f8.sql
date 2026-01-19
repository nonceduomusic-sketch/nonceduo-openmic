-- Create reservations table for karaoke bookings
CREATE TABLE public.reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  song_title TEXT NOT NULL,
  song_artist TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin_users table for login
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Reservations: Anyone can insert (public booking)
CREATE POLICY "Anyone can create reservations" 
ON public.reservations 
FOR INSERT 
WITH CHECK (true);

-- Reservations: Anyone can view (for admin panel)
CREATE POLICY "Anyone can view reservations" 
ON public.reservations 
FOR SELECT 
USING (true);

-- Reservations: Anyone can update (admin operations)
CREATE POLICY "Anyone can update reservations" 
ON public.reservations 
FOR UPDATE 
USING (true);

-- Reservations: Anyone can delete (reset functionality)
CREATE POLICY "Anyone can delete reservations" 
ON public.reservations 
FOR DELETE 
USING (true);

-- Admin users: Anyone can read (for login verification)
CREATE POLICY "Anyone can read admin users" 
ON public.admin_users 
FOR SELECT 
USING (true);

-- Insert the two admin users (using simple hash for demo - in production use proper auth)
INSERT INTO public.admin_users (username, password_hash) VALUES 
('Iacopo', 'nonceduo2026!'),
('Gianluca', 'nonceduo2026!');

-- Enable realtime for reservations
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;