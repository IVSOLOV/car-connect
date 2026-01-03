-- Fix 1: Remove redundant check from private_profiles policy
DROP POLICY IF EXISTS "Users can view their own private profile" ON public.private_profiles;

CREATE POLICY "Users can view their own private profile"
ON public.private_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Fix 2: Drop the overly permissive messages policy that overrides specific policies
DROP POLICY IF EXISTS "Only authenticated users can access messages" ON public.messages;