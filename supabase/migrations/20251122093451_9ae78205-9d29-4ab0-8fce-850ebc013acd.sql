-- Add viewed_at column to complaints table to track when admin views the complaint
ALTER TABLE public.complaints ADD COLUMN viewed_at timestamp with time zone;

-- Add index for better query performance
CREATE INDEX idx_complaints_viewed_at ON public.complaints(viewed_at);