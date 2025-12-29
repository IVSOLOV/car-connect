-- Add column to track the original daily price for showing discounts
ALTER TABLE public.listings 
ADD COLUMN original_daily_price numeric DEFAULT NULL;