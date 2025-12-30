-- Add weekly_price and original_weekly_price columns to listings table
ALTER TABLE public.listings 
ADD COLUMN weekly_price numeric NULL,
ADD COLUMN original_weekly_price numeric NULL;