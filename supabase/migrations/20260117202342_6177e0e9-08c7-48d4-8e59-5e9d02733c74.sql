-- Add license_plate column to listings table (nullable for existing records)
ALTER TABLE public.listings 
ADD COLUMN license_plate text;

-- Create a unique index that only applies to non-null license plates per state
CREATE UNIQUE INDEX unique_license_plate_per_state 
ON public.listings (LOWER(license_plate), state) 
WHERE license_plate IS NOT NULL AND license_plate != '';