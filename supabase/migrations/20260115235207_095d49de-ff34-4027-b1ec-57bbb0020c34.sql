-- Add admin access to private profiles for support purposes
CREATE POLICY "Admins can view private profiles"
ON public.private_profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));