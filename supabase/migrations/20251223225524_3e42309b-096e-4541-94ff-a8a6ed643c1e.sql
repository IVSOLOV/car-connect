-- Drop the public SELECT policy that exposes sensitive data
DROP POLICY IF EXISTS "Anyone can view profiles for owner display" ON public.profiles;

-- The existing "Users can view their own profile" policy already restricts access to owners only
-- This ensures phone, email, and other sensitive data is only visible to the profile owner