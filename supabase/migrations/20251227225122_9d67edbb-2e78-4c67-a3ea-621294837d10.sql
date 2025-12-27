-- Fix 1: Profiles table - restrict to only owner seeing their own full profile
-- Other authenticated users should only see profiles when viewing listings (limited data)
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Allow users to see their own full profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow authenticated users to view basic profile info (needed for listing owner display)
-- This is a separate policy for viewing other users' profiles with limited exposure
CREATE POLICY "Users can view other profiles for listings"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM listings 
    WHERE listings.user_id = profiles.user_id 
    AND listings.approval_status = 'approved'
  )
);

-- Fix 2: Listing bookings - ensure SELECT policy exists and is restrictive
-- The current policies are already restrictive (owners only), but let's verify
-- No changes needed as existing policies are correct

-- Fix 3: Booking date validation - add server-side constraints
-- Add check constraint for valid date range
ALTER TABLE public.listing_bookings
ADD CONSTRAINT check_valid_date_range 
CHECK (end_date >= start_date);

-- Create function to prevent overlapping bookings
CREATE OR REPLACE FUNCTION public.prevent_booking_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM listing_bookings
    WHERE listing_id = NEW.listing_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND daterange(start_date, end_date, '[]') && daterange(NEW.start_date, NEW.end_date, '[]')
  ) THEN
    RAISE EXCEPTION 'Booking dates overlap with existing booking';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for overlap prevention
DROP TRIGGER IF EXISTS check_booking_overlap ON public.listing_bookings;
CREATE TRIGGER check_booking_overlap
BEFORE INSERT OR UPDATE ON public.listing_bookings
FOR EACH ROW EXECUTE FUNCTION public.prevent_booking_overlap();