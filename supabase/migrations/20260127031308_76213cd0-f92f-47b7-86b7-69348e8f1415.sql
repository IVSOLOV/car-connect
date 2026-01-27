-- Create a view that masks email addresses for admin viewing
CREATE OR REPLACE VIEW public.deactivated_users_admin AS
SELECT 
  id,
  user_id,
  -- Mask email: show first 2 chars, mask middle, show domain
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

-- Update RLS policies: Admins can only view via the view, not direct table access
-- First drop existing SELECT policies
DROP POLICY IF EXISTS "Admins can view deactivated users" ON public.deactivated_users;

-- Create restrictive SELECT policy - only service role can read full emails
-- Admins must use the view which masks emails
CREATE POLICY "No direct SELECT - use view instead" 
ON public.deactivated_users 
FOR SELECT 
USING (false);

-- Keep INSERT and DELETE policies for admins
-- (these already exist and are fine)