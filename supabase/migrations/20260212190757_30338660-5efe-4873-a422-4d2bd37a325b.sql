
-- Add length constraints to prevent storage abuse

-- Messages
ALTER TABLE public.messages ADD CONSTRAINT message_length_check 
  CHECK (length(message) <= 5000);

-- Listings  
ALTER TABLE public.listings ADD CONSTRAINT description_length_check 
  CHECK (length(description) <= 10000);

-- Support tickets
ALTER TABLE public.support_tickets ADD CONSTRAINT subject_length_check 
  CHECK (length(subject) <= 500);

ALTER TABLE public.support_tickets ADD CONSTRAINT ticket_description_length_check 
  CHECK (length(description) <= 10000);

-- User reviews
ALTER TABLE public.user_reviews ADD CONSTRAINT comment_length_check 
  CHECK (length(comment) <= 2000);

-- Support ticket comments
ALTER TABLE public.support_ticket_comments ADD CONSTRAINT comment_message_length_check 
  CHECK (length(message) <= 5000);
