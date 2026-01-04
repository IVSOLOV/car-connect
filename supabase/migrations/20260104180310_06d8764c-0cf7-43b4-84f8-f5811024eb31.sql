-- Drop the existing policy
DROP POLICY IF EXISTS "Anyone can view approved listings" ON public.listings;

-- Create updated policy requiring authentication to view approved listings
CREATE POLICY "Authenticated users can view approved listings" 
ON public.listings 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL AND approval_status = 'approved'::text) 
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
  OR has_role(auth.uid(), 'admin'::app_role)
);