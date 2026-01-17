-- Enable RLS on support_ticket_admin_notes if not already enabled
ALTER TABLE public.support_ticket_admin_notes ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first to avoid conflicts
DROP POLICY IF EXISTS "anon_cannot_read" ON public.support_ticket_admin_notes;
DROP POLICY IF EXISTS "Admins can read admin notes" ON public.support_ticket_admin_notes;
DROP POLICY IF EXISTS "Admins can insert admin notes" ON public.support_ticket_admin_notes;
DROP POLICY IF EXISTS "Admins can update admin notes" ON public.support_ticket_admin_notes;
DROP POLICY IF EXISTS "Users can read notes on their tickets" ON public.support_ticket_admin_notes;

-- Only admins can insert admin notes
CREATE POLICY "Admins can insert admin notes"
ON public.support_ticket_admin_notes
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update admin notes
CREATE POLICY "Admins can update admin notes"
ON public.support_ticket_admin_notes
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can read all admin notes
CREATE POLICY "Admins can read admin notes"
ON public.support_ticket_admin_notes
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Users can read admin notes on their own tickets
CREATE POLICY "Users can read notes on their tickets"
ON public.support_ticket_admin_notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = support_ticket_admin_notes.ticket_id
    AND support_tickets.user_id = auth.uid()
  )
);