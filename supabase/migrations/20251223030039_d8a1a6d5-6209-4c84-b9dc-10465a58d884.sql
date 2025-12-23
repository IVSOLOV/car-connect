-- Allow anyone to view bookings (for availability checking on public listings)
CREATE POLICY "Anyone can view bookings for availability"
ON public.listing_bookings
FOR SELECT
USING (true);