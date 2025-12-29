-- Drop the existing policy that requires authentication
DROP POLICY IF EXISTS "Users can view other profiles for listings" ON public.profiles;

-- Create a new policy that allows anyone (including unauthenticated users) to view profiles
-- of users who have approved listings
CREATE POLICY "Anyone can view profiles for approved listings" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM listings 
    WHERE listings.user_id = profiles.user_id 
    AND listings.approval_status = 'approved'
  )
);