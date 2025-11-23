-- Add moderation fields to complaints table
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS flagged_reason TEXT,
ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS flagged_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS moderation_notes TEXT,
ADD COLUMN IF NOT EXISTS moderation_action TEXT;

-- Create index for faster queries on flagged complaints
CREATE INDEX IF NOT EXISTS idx_complaints_flagged ON public.complaints(flagged, flagged_at DESC);