-- Add approval_status column to listings
ALTER TABLE public.listings 
ADD COLUMN approval_status text NOT NULL DEFAULT 'pending' 
CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Update existing listings to be approved (so they remain visible)
UPDATE public.listings SET approval_status = 'approved';

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Anyone can view listings" ON public.listings;

-- Create new policy: Anyone can view APPROVED listings, owners can view their own (any status), admins can view all
CREATE POLICY "View listings based on approval status" 
ON public.listings 
FOR SELECT 
USING (
  approval_status = 'approved' 
  OR auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin')
);