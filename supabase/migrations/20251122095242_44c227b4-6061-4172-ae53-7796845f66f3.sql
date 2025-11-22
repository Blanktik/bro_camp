-- Add edited_at column to track complaint edits
ALTER TABLE public.complaints ADD COLUMN edited_at timestamp with time zone;

-- Add index for better query performance
CREATE INDEX idx_complaints_edited_at ON public.complaints(edited_at);