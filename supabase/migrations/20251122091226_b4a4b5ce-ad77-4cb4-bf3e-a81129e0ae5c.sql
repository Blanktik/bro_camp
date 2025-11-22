-- Create storage bucket for complaint media
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-media', 'complaint-media', true);

-- Add media URLs column to complaints table
ALTER TABLE public.complaints
ADD COLUMN media_urls TEXT[];

-- Create RLS policies for complaint media bucket
CREATE POLICY "Anyone can view complaint media"
ON storage.objects FOR SELECT
USING (bucket_id = 'complaint-media');

CREATE POLICY "Authenticated users can upload complaint media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'complaint-media' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own complaint media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'complaint-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);