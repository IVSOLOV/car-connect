-- Drop the existing policy that requires authentication
DROP POLICY IF EXISTS "Authenticated users can view listings based on approval status" ON public.listings;

-- Create new policy that allows guests to view approved listings
-- While still allowing owners to see their own and admins to see all
CREATE POLICY "Anyone can view approved listings"
ON public.listings
FOR SELECT
USING (
  approval_status = 'approved'
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);