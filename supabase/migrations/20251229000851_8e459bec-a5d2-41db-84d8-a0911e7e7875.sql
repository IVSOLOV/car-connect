-- Add edited_at column to track when messages were edited
ALTER TABLE public.messages 
ADD COLUMN edited_at timestamp with time zone DEFAULT NULL;