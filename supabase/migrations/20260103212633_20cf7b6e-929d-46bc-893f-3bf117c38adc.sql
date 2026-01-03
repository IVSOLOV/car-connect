-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own private profile" ON public.private_profiles;

-- Create updated policy that explicitly requires authentication
CREATE POLICY "Users can view their own private profile" 
ON public.private_profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);