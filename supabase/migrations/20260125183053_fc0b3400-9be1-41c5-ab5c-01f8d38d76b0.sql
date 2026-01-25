-- Fix: Require authentication for viewing listings to prevent data scraping
-- This protects license plates, pricing history, and owner information

-- Drop existing SELECT policy that allows unauthenticated access
DROP POLICY IF EXISTS "Anyone can view approved listings" ON public.listings;

-- Recreate policy requiring authentication
-- Authenticated users can view approved listings, their own listings, or all if admin
CREATE POLICY "Authenticated users can view approved listings"
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