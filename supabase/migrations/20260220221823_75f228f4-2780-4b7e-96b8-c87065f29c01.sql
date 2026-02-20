
-- Create admin audit log table to track access to sensitive data
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs (read-only, no delete/update)
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Only the system (via security definer functions) can insert audit logs
-- No direct INSERT policy for users - insertions happen through secure functions

-- Create a secure function for admins to access private profiles with audit logging
CREATE OR REPLACE FUNCTION public.admin_get_private_profile(_target_user_id uuid)
RETURNS TABLE(user_id uuid, phone text, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id uuid;
BEGIN
  -- Verify caller is authenticated
  _caller_id := auth.uid();
  IF _caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify caller is admin
  IF NOT has_role(_caller_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Log this access to the audit log
  INSERT INTO public.admin_audit_log (admin_user_id, action, resource_type, resource_id, details)
  VALUES (_caller_id, 'READ_PHONE', 'private_profiles', _target_user_id::text, 
          jsonb_build_object('timestamp', now()));

  -- Return the private profile
  RETURN QUERY
    SELECT pp.user_id, pp.phone, pp.created_at, pp.updated_at
    FROM public.private_profiles pp
    WHERE pp.user_id = _target_user_id;
END;
$$;

-- Create a function for admins to list all private profiles with audit logging
CREATE OR REPLACE FUNCTION public.admin_list_private_profiles()
RETURNS TABLE(user_id uuid, phone text, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id uuid;
BEGIN
  _caller_id := auth.uid();
  IF _caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT has_role(_caller_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Log bulk access
  INSERT INTO public.admin_audit_log (admin_user_id, action, resource_type, details)
  VALUES (_caller_id, 'READ_ALL_PHONES', 'private_profiles',
          jsonb_build_object('timestamp', now()));

  RETURN QUERY
    SELECT pp.user_id, pp.phone, pp.created_at, pp.updated_at
    FROM public.private_profiles pp;
END;
$$;

-- Create a function for admins to access deactivated users with audit logging
CREATE OR REPLACE FUNCTION public.admin_list_deactivated_users()
RETURNS TABLE(id uuid, user_id uuid, deactivated_by uuid, masked_email text, reason text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id uuid;
BEGIN
  _caller_id := auth.uid();
  IF _caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT has_role(_caller_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Log access to deactivated users list
  INSERT INTO public.admin_audit_log (admin_user_id, action, resource_type, details)
  VALUES (_caller_id, 'READ_DEACTIVATED_USERS', 'deactivated_users',
          jsonb_build_object('timestamp', now()));

  -- Return masked emails only
  RETURN QUERY
    SELECT 
      du.id,
      du.user_id,
      du.deactivated_by,
      -- Mask the email: show first 2 chars + *** + @domain
      CASE 
        WHEN du.email IS NOT NULL AND position('@' in du.email) > 2 THEN
          substring(du.email, 1, 2) || '***@' || split_part(du.email, '@', 2)
        ELSE '***'
      END AS masked_email,
      du.reason,
      du.created_at
    FROM public.deactivated_users du
    ORDER BY du.created_at DESC;
END;
$$;

-- Revoke direct SELECT on deactivated_users from authenticated users
-- (access should only go through the view or audit-logged functions)
-- Drop the broad admin SELECT policy and replace with a more restrictive note
-- The existing RLS policies already restrict to admins, but we add audit via functions

-- Grant execute permissions on the new functions to authenticated users
-- (RLS inside the functions will enforce admin-only access)
GRANT EXECUTE ON FUNCTION public.admin_get_private_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_private_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_deactivated_users() TO authenticated;

-- Allow the security definer functions to insert into audit log
-- (functions run as owner, so this is handled automatically)

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user ON public.admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_resource ON public.admin_audit_log(resource_type, action);
