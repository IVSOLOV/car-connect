-- Drop the restrictive SELECT policy that only allows viewing own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a new policy that allows viewing profiles for listing owners (public viewing for listings)
CREATE POLICY "Anyone can view profiles for listings" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Note: Users can still only UPDATE/INSERT their own profile due to existing policies