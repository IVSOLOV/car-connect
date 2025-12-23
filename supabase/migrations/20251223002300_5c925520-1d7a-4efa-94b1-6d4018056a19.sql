-- Allow authenticated users to upgrade themselves to host
CREATE POLICY "Users can upgrade to host"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'host'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'host'
  )
);