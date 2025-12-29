-- Add column to track the original monthly price for showing discounts
ALTER TABLE public.listings 
ADD COLUMN original_monthly_price numeric DEFAULT NULL;