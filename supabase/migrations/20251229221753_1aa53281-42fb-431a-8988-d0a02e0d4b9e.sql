-- Remove sensitive renter contact information columns from listing_bookings
-- The app has a messaging system for owner-renter communication, so storing 
-- email/name directly is unnecessary and creates a security risk

ALTER TABLE public.listing_bookings DROP COLUMN IF EXISTS renter_name;
ALTER TABLE public.listing_bookings DROP COLUMN IF EXISTS renter_email;