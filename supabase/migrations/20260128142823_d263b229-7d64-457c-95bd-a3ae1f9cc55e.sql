-- Create comments table for support tickets
CREATE TABLE public.support_ticket_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  message TEXT NOT NULL,
  images TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_ticket_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments on their own tickets
CREATE POLICY "Users can view comments on their tickets"
ON public.support_ticket_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM support_tickets
    WHERE support_tickets.id = support_ticket_comments.ticket_id
    AND support_tickets.user_id = auth.uid()
  )
);

-- Users can create comments on their own tickets
CREATE POLICY "Users can create comments on their tickets"
ON public.support_ticket_comments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM support_tickets
    WHERE support_tickets.id = support_ticket_comments.ticket_id
    AND support_tickets.user_id = auth.uid()
  )
);

-- Admins can view all comments
CREATE POLICY "Admins can view all comments"
ON public.support_ticket_comments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can create comments on any ticket
CREATE POLICY "Admins can create comments"
ON public.support_ticket_comments
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_comments;