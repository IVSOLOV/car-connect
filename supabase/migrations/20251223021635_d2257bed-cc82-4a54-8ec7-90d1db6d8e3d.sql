-- Create listings table for car rentals
CREATE TABLE public.listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  title_status TEXT NOT NULL DEFAULT 'clear',
  daily_price DECIMAL(10,2) NOT NULL,
  monthly_price DECIMAL(10,2),
  description TEXT,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Anyone can view listings (public data)
CREATE POLICY "Anyone can view listings"
ON public.listings
FOR SELECT
USING (true);

-- Only hosts/admins can create their own listings
CREATE POLICY "Hosts can create listings"
ON public.listings
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND 
  (has_role(auth.uid(), 'host') OR has_role(auth.uid(), 'admin'))
);

-- Owners can update their own listings
CREATE POLICY "Owners can update their listings"
ON public.listings
FOR UPDATE
USING (auth.uid() = user_id);

-- Owners can delete their own listings
CREATE POLICY "Owners can delete their listings"
ON public.listings
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_listings_updated_at
BEFORE UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_listings_user_id ON public.listings(user_id);
CREATE INDEX idx_listings_created_at ON public.listings(created_at DESC);