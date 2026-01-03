-- Add vehicle_type column to listings table
ALTER TABLE public.listings 
ADD COLUMN vehicle_type text NOT NULL DEFAULT 'car';

-- Add comment for documentation
COMMENT ON COLUMN public.listings.vehicle_type IS 'Type of vehicle: car, suv, minivan, truck, van, cargo_van, box_truck';