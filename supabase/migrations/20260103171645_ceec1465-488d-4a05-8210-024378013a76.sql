-- Create separate table for admin notes (admin-only access)
CREATE TABLE public.support_ticket_admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(ticket_id)
);

-- Enable RLS
ALTER TABLE public.support_ticket_admin_notes ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin notes
CREATE POLICY "Admins can view admin notes"
ON public.support_ticket_admin_notes
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can create admin notes
CREATE POLICY "Admins can create admin notes"
ON public.support_ticket_admin_notes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update admin notes
CREATE POLICY "Admins can update admin notes"
ON public.support_ticket_admin_notes
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete admin notes
CREATE POLICY "Admins can delete admin notes"
ON public.support_ticket_admin_notes
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing admin_notes data
INSERT INTO public.support_ticket_admin_notes (ticket_id, notes)
SELECT id, admin_notes FROM public.support_tickets
WHERE admin_notes IS NOT NULL AND admin_notes != '';

-- Drop the admin_notes column from support_tickets
ALTER TABLE public.support_tickets DROP COLUMN admin_notes;

-- Add updated_at trigger
CREATE TRIGGER update_support_ticket_admin_notes_updated_at
BEFORE UPDATE ON public.support_ticket_admin_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();