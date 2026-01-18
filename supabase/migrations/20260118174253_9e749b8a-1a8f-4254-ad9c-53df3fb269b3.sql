-- Create storage bucket for support ticket attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload support attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'support-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access for support staff to view attachments
CREATE POLICY "Support attachments are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'support-attachments');

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete their own support attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'support-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);