-- Remove the policy that allows anyone to view bookings
DROP POLICY IF EXISTS "Anyone can view booking dates for availability" ON public.listing_bookings;

-- Also allow admins to view all bookings for support purposes
CREATE POLICY "Admins can view all bookings"
ON public.listing_bookings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));