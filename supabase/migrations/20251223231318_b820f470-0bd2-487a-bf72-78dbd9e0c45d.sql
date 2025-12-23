-- Drop the public SELECT policy that exposes renter contact information
DROP POLICY IF EXISTS "Anyone can view bookings for availability" ON public.listing_bookings;

-- The existing "Owners can view their listing bookings" policy already restricts access to listing owners only
-- This ensures renter_email, renter_name, and other booking details are only visible to the listing owner

-- Create a separate policy for availability checking that only exposes dates (no PII)
-- This allows anyone to check if dates are booked without seeing renter info
CREATE POLICY "Anyone can check booking dates for availability"
ON public.listing_bookings
FOR SELECT
USING (true);

-- Wait - this would still expose all columns. Instead, we should NOT have public access at all
-- and handle availability checking through a secure RPC function or just client-side calendar logic

-- Let's drop that policy and keep it owner-only
DROP POLICY IF EXISTS "Anyone can check booking dates for availability" ON public.listing_bookings;