-- Add deactivation_reason column to listings table
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS deactivation_reason text;