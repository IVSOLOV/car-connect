-- Add read_at column to track when messages were read
ALTER TABLE public.messages ADD COLUMN read_at timestamp with time zone DEFAULT NULL;

-- Create index for efficient unread message queries
CREATE INDEX idx_messages_recipient_read ON public.messages(recipient_id, read_at);