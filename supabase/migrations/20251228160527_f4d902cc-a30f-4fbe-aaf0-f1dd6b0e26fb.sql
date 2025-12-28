-- Add DELETE policy allowing users to delete their own sent messages
CREATE POLICY "Users can delete their sent messages"
ON public.messages
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);