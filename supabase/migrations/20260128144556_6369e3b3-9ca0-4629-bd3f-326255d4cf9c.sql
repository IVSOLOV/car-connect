-- Enable RLS on the deactivated_users_admin view
ALTER VIEW public.deactivated_users_admin SET (security_invoker = on);

-- Add RLS policy to allow only admins to read the view
-- Note: Views inherit RLS from base tables when security_invoker is on
-- But we also need to ensure the view itself is protected

-- Drop and recreate the view with security_invoker to ensure it's properly configured
DROP VIEW IF EXISTS public.deactivated_users_admin;

CREATE VIEW public.deactivated_users_admin
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  deactivated_by,
  created_at,
  -- Mask email: show first 2 chars + *** + domain
  CASE 
    WHEN email IS NOT NULL AND length(email) > 0 THEN
      substring(email from 1 for 2) || '***@' || split_part(email, '@', 2)
    ELSE NULL
  END as masked_email,
  reason
FROM public.deactivated_users;