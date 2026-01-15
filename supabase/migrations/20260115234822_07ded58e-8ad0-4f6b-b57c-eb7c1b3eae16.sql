-- Drop the current policy that allows unauthenticated access
DROP POLICY IF EXISTS "Anyone can view approved listings" ON public.listings;

-- Create new policy requiring authentication to view approved listings
CREATE POLICY "Authenticated users can view approved listings"
ON public.listings
FOR SELECT
USING (
  -- Authenticated users can view approved listings
  (auth.uid() IS NOT NULL AND approval_status = 'approved')
  -- Owners can always view their own listings (any status)
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  -- Admins can view all listings
  OR has_role(auth.uid(), 'admin'::app_role)
);