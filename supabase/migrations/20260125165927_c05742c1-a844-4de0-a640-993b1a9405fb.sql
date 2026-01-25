-- Add images column to support_ticket_admin_notes for admin attachments
ALTER TABLE public.support_ticket_admin_notes
ADD COLUMN images text[] DEFAULT '{}';

-- Add comment
COMMENT ON COLUMN public.support_ticket_admin_notes.images IS 'Array of image URLs attached to admin response';