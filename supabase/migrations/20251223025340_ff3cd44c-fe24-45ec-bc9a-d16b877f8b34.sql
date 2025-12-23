-- Create a table to store listing bookings/blocked dates
CREATE TABLE public.listing_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  renter_name TEXT,
  renter_email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Enable Row Level Security
ALTER TABLE public.listing_bookings ENABLE ROW LEVEL SECURITY;

-- Create policies - owners can manage their listing bookings
CREATE POLICY "Owners can view their listing bookings"
ON public.listing_bookings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = listing_bookings.listing_id
    AND listings.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can create bookings for their listings"
ON public.listing_bookings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = listing_bookings.listing_id
    AND listings.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can update their listing bookings"
ON public.listing_bookings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = listing_bookings.listing_id
    AND listings.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can delete their listing bookings"
ON public.listing_bookings
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = listing_bookings.listing_id
    AND listings.user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_listing_bookings_updated_at
BEFORE UPDATE ON public.listing_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_listing_bookings_listing_id ON public.listing_bookings(listing_id);
CREATE INDEX idx_listing_bookings_dates ON public.listing_bookings(start_date, end_date);