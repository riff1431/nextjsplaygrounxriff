-- Reset RLS policies for profiles to ensure access
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles; 
-- (Dropping potential other common names just in case, though only the ones below matter for this issue)

-- 1. Allow users to view their own profile (Critical for reading wallet_balance)
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 2. Allow users to update their own profile (Critical for payment deduction)
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE
USING (auth.uid() = id);
