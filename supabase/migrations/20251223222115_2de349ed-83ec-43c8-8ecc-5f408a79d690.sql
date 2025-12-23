-- Add UPDATE policy for messages so users can mark their received messages as read
CREATE POLICY "Recipients can mark messages as read" 
ON public.messages 
FOR UPDATE 
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);