-- Fix the view to use security_invoker (recommended approach)
DROP VIEW IF EXISTS public.deactivated_users_admin;

CREATE VIEW public.deactivated_users_admin
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  CONCAT(
    LEFT(email, 2),
    REPEAT('*', GREATEST(LENGTH(SPLIT_PART(email, '@', 1)) - 2, 0)),
    '@',
    SPLIT_PART(email, '@', 2)
  ) AS masked_email,
  reason,
  deactivated_by,
  created_at
FROM public.deactivated_users;

-- Grant access to the view
GRANT SELECT ON public.deactivated_users_admin TO authenticated;

-- Now we need a SELECT policy on the base table that allows the view to work
-- but only for admins (view inherits caller's permissions with security_invoker)
DROP POLICY IF EXISTS "No direct SELECT - use view instead" ON public.deactivated_users;

CREATE POLICY "Admins can read for view access" 
ON public.deactivated_users 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));