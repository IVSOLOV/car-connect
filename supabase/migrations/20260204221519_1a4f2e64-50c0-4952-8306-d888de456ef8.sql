-- Fix 1: Make support-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'support-attachments';

-- Drop the public SELECT policy
DROP POLICY IF EXISTS "Support attachments are publicly accessible" ON storage.objects;

-- Add restricted policy: users can view their own support attachments
CREATE POLICY "Users can view their own support attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can view all support attachments
CREATE POLICY "Admins can view all support attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Fix 2 & 3: Ensure deactivated_users table RLS is properly enforced
-- The table already has RLS enabled with admin-only policies, but let's verify by recreating the view with security_invoker

-- Drop and recreate the view with security_invoker = true
DROP VIEW IF EXISTS public.deactivated_users_admin;

CREATE VIEW public.deactivated_users_admin 
WITH (security_invoker = on)
AS
SELECT 
  id,
  user_id,
  deactivated_by,
  created_at,
  -- Mask the email: show first 2 chars, then ***, then @domain
  CASE 
    WHEN email IS NOT NULL AND position('@' in email) > 2 
    THEN substring(email from 1 for 2) || '***' || substring(email from position('@' in email))
    ELSE '***@***'
  END as masked_email,
  reason
FROM public.deactivated_users;

-- Grant select on the view only to authenticated users (RLS on underlying table will filter)
GRANT SELECT ON public.deactivated_users_admin TO authenticated;