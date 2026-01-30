-- Enable RLS on the deactivated_users_admin view
ALTER VIEW public.deactivated_users_admin SET (security_invoker = on);

-- Add RLS policy for admin-only access to the view
CREATE POLICY "Only admins can view deactivated users admin"
ON public.deactivated_users
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));