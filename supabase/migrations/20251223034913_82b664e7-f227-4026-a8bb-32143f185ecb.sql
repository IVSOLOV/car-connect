-- Create saved_listings table for users to save favorite listings
CREATE TABLE public.saved_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Enable RLS
ALTER TABLE public.saved_listings ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved listings
CREATE POLICY "Users can view their saved listings"
ON public.saved_listings
FOR SELECT
USING (auth.uid() = user_id);

-- Users can save listings
CREATE POLICY "Users can save listings"
ON public.saved_listings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unsave listings
CREATE POLICY "Users can unsave listings"
ON public.saved_listings
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_saved_listings_user_id ON public.saved_listings(user_id);
CREATE INDEX idx_saved_listings_listing_id ON public.saved_listings(listing_id);