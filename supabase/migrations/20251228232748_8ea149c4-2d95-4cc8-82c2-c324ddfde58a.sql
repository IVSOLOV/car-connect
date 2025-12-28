-- Add response_read_at column to track when user has seen admin responses
ALTER TABLE public.support_tickets 
ADD COLUMN response_read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;