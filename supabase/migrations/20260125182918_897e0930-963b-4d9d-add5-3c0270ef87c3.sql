-- Fix: Require authentication for all SELECT operations on profiles table
-- This prevents unauthenticated users from scraping profile data

-- Drop existing SELECT policies that don't require authentication
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of listing owners" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of message participants" ON public.profiles;

-- Recreate policies with explicit authentication requirement

-- Users can view their own profile (requires auth)
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Admins can view all profiles (has_role already checks auth internally)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Users can view profiles of listing owners who have approved listings (requires auth)
CREATE POLICY "Users can view profiles of listing owners"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1
    FROM public.listings
    WHERE listings.user_id = profiles.user_id
    AND listings.approval_status = 'approved'
  )
);

-- Users can view profiles of users they have messaged with (requires auth)
CREATE POLICY "Users can view profiles of message participants"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.messages
    WHERE (messages.sender_id = auth.uid() AND messages.recipient_id = profiles.user_id)
       OR (messages.recipient_id = auth.uid() AND messages.sender_id = profiles.user_id)
  )
);