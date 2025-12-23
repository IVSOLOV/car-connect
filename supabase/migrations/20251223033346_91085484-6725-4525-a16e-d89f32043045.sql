-- Add policy to allow anyone to view profiles (for displaying owner names on listings)
CREATE POLICY "Anyone can view profiles for owner display"
ON public.profiles
FOR SELECT
USING (true);