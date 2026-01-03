-- Add fuel_type column to listings table (optional field)
ALTER TABLE public.listings 
ADD COLUMN fuel_type TEXT DEFAULT 'gas';

-- Add comment for clarity
COMMENT ON COLUMN public.listings.fuel_type IS 'Vehicle fuel type: gas, hybrid, electric';