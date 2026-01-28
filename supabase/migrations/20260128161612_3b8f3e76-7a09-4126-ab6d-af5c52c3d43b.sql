-- Allow public (unauthenticated) users to view approved listings on the home page
CREATE POLICY "Anyone can view approved listings" 
ON public.listings 
FOR SELECT 
USING (approval_status = 'approved');