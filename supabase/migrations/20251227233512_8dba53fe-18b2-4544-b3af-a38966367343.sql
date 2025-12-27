-- Allow users to view profiles of people they have exchanged messages with
CREATE POLICY "Users can view profiles of message participants"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages
    WHERE (messages.sender_id = auth.uid() AND messages.recipient_id = profiles.user_id)
       OR (messages.recipient_id = auth.uid() AND messages.sender_id = profiles.user_id)
  )
);