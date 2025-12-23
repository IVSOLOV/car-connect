-- 1. Make the message-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'message-attachments';

-- 2. Drop existing public SELECT policy
DROP POLICY IF EXISTS "Anyone can view message attachments" ON storage.objects;

-- 3. Create policy: Users can view attachments in their own folder (folder-based access)
CREATE POLICY "Users can view their own message attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Also allow recipients to view attachments sent to them
-- We need to check if the file is part of a message where user is sender or recipient
CREATE POLICY "Users can view attachments from their conversations"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE (m.sender_id = auth.uid() OR m.recipient_id = auth.uid())
    AND m.attachments::text LIKE '%' || storage.filename(name) || '%'
  )
);

-- 5. Ensure upload policy exists (users can upload to their own folder)
DROP POLICY IF EXISTS "Users can upload message attachments" ON storage.objects;
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 6. Users can delete their own attachments
DROP POLICY IF EXISTS "Users can delete their own message attachments" ON storage.objects;
CREATE POLICY "Users can delete their own message attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);