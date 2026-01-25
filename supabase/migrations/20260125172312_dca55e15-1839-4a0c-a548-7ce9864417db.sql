-- Drop the overly permissive policy that exposes all host profiles
DROP POLICY IF EXISTS "Authenticated users can view profiles for approved listings" ON public.profiles;

-- The following policies remain and are secure:
-- 1. "Users can view own profile" - allows users to see their own data
-- 2. "Admins can view all profiles" - admin access
-- 3. "Users can view profiles of message participants" - only see profiles of people you're messaging