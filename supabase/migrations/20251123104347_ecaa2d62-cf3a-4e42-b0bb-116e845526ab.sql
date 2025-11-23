-- Add DELETE policy for students to delete their own complaints
CREATE POLICY "Users can delete own unviewed complaints"
  ON public.complaints FOR DELETE
  USING (
    user_id = auth.uid() AND 
    viewed_at IS NULL AND 
    admin_response IS NULL
  );

-- Add appeal system fields
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS appeal_text TEXT,
ADD COLUMN IF NOT EXISTS appeal_submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS appeal_status TEXT DEFAULT NULL CHECK (appeal_status IN ('pending', 'approved', 'rejected', NULL)),
ADD COLUMN IF NOT EXISTS appeal_reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS appeal_reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS appeal_response TEXT;

-- Create index for appeals
CREATE INDEX IF NOT EXISTS idx_complaints_appeal_status ON public.complaints(appeal_status, appeal_submitted_at DESC);