-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone can view booking dates for availability" ON listing_bookings;

-- Create as a permissive policy so anyone can see booking dates
CREATE POLICY "Anyone can view booking dates for availability"
ON listing_bookings
FOR SELECT
TO public
USING (true);