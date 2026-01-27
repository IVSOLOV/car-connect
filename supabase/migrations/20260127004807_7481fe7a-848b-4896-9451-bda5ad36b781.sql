-- Create a separate table for sensitive listing data (license plates)
-- Only owners and admins can view this data

CREATE TABLE public.listing_sensitive_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL UNIQUE REFERENCES public.listings(id) ON DELETE CASCADE,
  license_plate text,
  state text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.listing_sensitive_data ENABLE ROW LEVEL SECURITY;

-- Only listing owners can view their sensitive data
CREATE POLICY "Owners can view their listing sensitive data"
ON public.listing_sensitive_data
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = listing_sensitive_data.listing_id
    AND listings.user_id = auth.uid()
  )
);

-- Admins can view all sensitive data
CREATE POLICY "Admins can view all sensitive data"
ON public.listing_sensitive_data
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Owners can insert their listing sensitive data
CREATE POLICY "Owners can insert their listing sensitive data"
ON public.listing_sensitive_data
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = listing_sensitive_data.listing_id
    AND listings.user_id = auth.uid()
  )
);

-- Owners can update their listing sensitive data
CREATE POLICY "Owners can update their listing sensitive data"
ON public.listing_sensitive_data
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = listing_sensitive_data.listing_id
    AND listings.user_id = auth.uid()
  )
);

-- Owners can delete their listing sensitive data
CREATE POLICY "Owners can delete their listing sensitive data"
ON public.listing_sensitive_data
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = listing_sensitive_data.listing_id
    AND listings.user_id = auth.uid()
  )
);

-- Admins can manage all sensitive data
CREATE POLICY "Admins can manage all sensitive data"
ON public.listing_sensitive_data
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_listing_sensitive_data_updated_at
BEFORE UPDATE ON public.listing_sensitive_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing license plate data to the new table
INSERT INTO public.listing_sensitive_data (listing_id, license_plate, state)
SELECT id, license_plate, state FROM public.listings
WHERE license_plate IS NOT NULL AND license_plate != '';

-- Drop the old unique index
DROP INDEX IF EXISTS unique_license_plate_per_state;

-- Create the unique index on the new table
CREATE UNIQUE INDEX unique_license_plate_per_state_new 
ON public.listing_sensitive_data (LOWER(license_plate), state)
WHERE license_plate IS NOT NULL AND license_plate != '';

-- Remove the license_plate column from listings table
ALTER TABLE public.listings DROP COLUMN license_plate;