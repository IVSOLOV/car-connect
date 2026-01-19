-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view approved listings" ON public.listings;

-- Create new policy that allows anyone (including unauthenticated users) to view approved listings
CREATE POLICY "Anyone can view approved listings" 
ON public.listings 
FOR SELECT 
USING (
  -- Anyone can view approved listings
  (approval_status = 'approved')
  -- Owners can view their own listings regardless of status
  OR (auth.uid() = user_id)
  -- Admins can view all listings
  OR has_role(auth.uid(), 'admin'::app_role)
);