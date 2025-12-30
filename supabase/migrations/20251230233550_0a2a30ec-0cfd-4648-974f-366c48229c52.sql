-- Fix profiles table security: require authentication for all SELECT operations
-- Drop the existing policy that allows viewing profiles for approved listings (allows anonymous access)
DROP POLICY IF EXISTS "Anyone can view profiles for approved listings" ON public.profiles;

-- Create new policy that requires authentication AND approved listings
CREATE POLICY "Authenticated users can view profiles for approved listings" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1
    FROM listings
    WHERE listings.user_id = profiles.user_id 
    AND listings.approval_status = 'approved'
  )
);