-- Fix listings table security: require authentication for viewing listings
-- Drop the existing policy that allows anonymous access
DROP POLICY IF EXISTS "View listings based on approval status" ON public.listings;

-- Create new policy that requires authentication for viewing listings
CREATE POLICY "Authenticated users can view listings based on approval status" 
ON public.listings 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    approval_status = 'approved' 
    OR auth.uid() = user_id 
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);