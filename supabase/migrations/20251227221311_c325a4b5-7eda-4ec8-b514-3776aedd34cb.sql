-- Create user_reviews table for rating users
CREATE TABLE public.user_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_id uuid NOT NULL,
  reviewed_id uuid NOT NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_review_per_listing UNIQUE (reviewer_id, reviewed_id, listing_id)
);

-- Enable RLS
ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view reviews
CREATE POLICY "Anyone can view reviews"
ON public.user_reviews
FOR SELECT
USING (true);

-- Users can create reviews for others
CREATE POLICY "Users can create reviews"
ON public.user_reviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reviewer_id AND auth.uid() != reviewed_id);

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
ON public.user_reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = reviewer_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews"
ON public.user_reviews
FOR DELETE
TO authenticated
USING (auth.uid() = reviewer_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_reviews_updated_at
BEFORE UPDATE ON public.user_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();