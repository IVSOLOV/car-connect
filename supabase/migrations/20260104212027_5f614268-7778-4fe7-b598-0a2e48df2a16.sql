-- Add guest_name column to listing_bookings table
ALTER TABLE public.listing_bookings
ADD COLUMN guest_name text;