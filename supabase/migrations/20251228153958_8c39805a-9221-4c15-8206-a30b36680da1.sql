-- Drop the existing check constraint
ALTER TABLE public.listings DROP CONSTRAINT listings_approval_status_check;

-- Add updated check constraint that includes 'deactivated'
ALTER TABLE public.listings ADD CONSTRAINT listings_approval_status_check 
CHECK (approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'deactivated'::text]));