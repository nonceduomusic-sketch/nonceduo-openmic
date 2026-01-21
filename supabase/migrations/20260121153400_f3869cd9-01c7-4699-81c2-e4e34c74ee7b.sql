-- Step 1: Add 'owner' to the enum (this will be committed automatically)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';