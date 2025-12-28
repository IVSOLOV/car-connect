-- Drop ALL existing policies on listing_bookings (with and without trailing spaces)
DROP POLICY IF EXISTS "Owners can view their listing bookings" ON public.listing_bookings;
DROP POLICY IF EXISTS "Owners can create bookings for their listings" ON public.listing_bookings;
DROP POLICY IF EXISTS "Owners can update their listing bookings" ON public.listing_bookings;
DROP POLICY IF EXISTS "Owners can delete their listing bookings" ON public.listing_bookings;

-- Recreate with explicit TO authenticated role and proper owner checks
CREATE POLICY "Owners can view their listing bookings"
ON public.listing_bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM listings
    WHERE listings.id = listing_bookings.listing_id
    AND listings.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can create bookings for their listings"
ON public.listing_bookings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM listings
    WHERE listings.id = listing_bookings.listing_id
    AND listings.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can update their listing bookings"
ON public.listing_bookings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM listings
    WHERE listings.id = listing_bookings.listing_id
    AND listings.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can delete their listing bookings"
ON public.listing_bookings
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM listings
    WHERE listings.id = listing_bookings.listing_id
    AND listings.user_id = auth.uid()
  )
);