-- Add unique constraint to prevent multiple reviews from the same reviewer to the same user
ALTER TABLE public.user_reviews 
ADD CONSTRAINT user_reviews_reviewer_reviewed_unique 
UNIQUE (reviewer_id, reviewed_id);