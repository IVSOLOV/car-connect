-- Allow users to view admin notes for their own tickets (read-only)
CREATE POLICY "Users can view admin notes for their own tickets"
ON public.support_ticket_admin_notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = support_ticket_admin_notes.ticket_id
    AND support_tickets.user_id = auth.uid()
  )
);