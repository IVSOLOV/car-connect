-- Add delivery_available column to listings table
ALTER TABLE public.listings 
ADD COLUMN delivery_available boolean NOT NULL DEFAULT false;