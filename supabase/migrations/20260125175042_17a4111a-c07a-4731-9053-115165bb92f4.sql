-- Allow users to view profiles of owners who have approved listings
-- This is necessary for marketplace functionality - viewing car owner info
CREATE POLICY "Users can view profiles of listing owners"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.listings
    WHERE listings.user_id = profiles.user_id
    AND listings.approval_status = 'approved'
  )
);