-- 1. Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. Create profiles table for registered users
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  is_online boolean DEFAULT false,
  settings jsonb DEFAULT '{}'::jsonb
);

-- 3. Create indexes
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- 4. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR is_owner(auth.uid()));

-- 6. Trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Function for auto profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), ' ', '_')) || '_' || SUBSTRING(NEW.id::text, 1, 4)
  );
  RETURN NEW;
END;
$$;

-- 8. Trigger for new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 9. Extend conversations for registered users
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS created_by_user_id uuid;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_registered_only boolean DEFAULT false;

-- 10. Extend participants for registered users
ALTER TABLE public.conversation_participants ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS idx_conv_part_user_id ON public.conversation_participants(user_id);

-- 11. Extend messages for registered users  
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS sender_user_id uuid;

-- 12. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;