-- Drop the overly permissive policy that exposes phone numbers to the public
DROP POLICY IF EXISTS "Anyone can view profiles for listings" ON public.profiles;

-- Create a policy that only allows authenticated users to view profiles
-- This protects phone numbers from public scraping
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Ensure profile owners can always see their own full profile
-- (This is already covered by the above policy, but we keep the update policy separate)