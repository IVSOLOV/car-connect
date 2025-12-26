-- Add rejection_reason column to listings table
ALTER TABLE public.listings ADD COLUMN rejection_reason text;