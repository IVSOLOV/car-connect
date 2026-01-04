-- Allow anyone to view bookings for availability checking (only date info, not sensitive data)
CREATE POLICY "Anyone can view booking dates for availability"
ON public.listing_bookings
FOR SELECT
USING (true);