-- Add missing storage policies for car-photos bucket (only those that don't exist yet)
DO $$
BEGIN
  -- Check and create upload policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND policyname = 'Users can upload car photos'
  ) THEN
    CREATE POLICY "Users can upload car photos"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'car-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  
  -- Check and create update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND policyname = 'Users can update their car photos'
  ) THEN
    CREATE POLICY "Users can update their car photos"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'car-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  
  -- Check and create delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND policyname = 'Users can delete their car photos'
  ) THEN
    CREATE POLICY "Users can delete their car photos"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'car-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;