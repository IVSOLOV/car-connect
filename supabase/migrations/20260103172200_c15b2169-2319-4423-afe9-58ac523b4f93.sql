-- Add explicit policy to block unauthenticated access to messages
CREATE POLICY "Only authenticated users can access messages"
ON public.messages
FOR ALL
USING (auth.uid() IS NOT NULL);