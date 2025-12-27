-- Add policy for admins to update any listing (for approvals)
CREATE POLICY "Admins can update any listing"
ON public.listings
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));