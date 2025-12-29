-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.user_reviews;

-- Create a new policy that only allows authenticated users to view reviews
CREATE POLICY "Authenticated users can view reviews" 
ON public.user_reviews 
FOR SELECT 
USING (auth.uid() IS NOT NULL);