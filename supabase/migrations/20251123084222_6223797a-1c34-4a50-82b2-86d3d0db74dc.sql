-- Add resolved_at column to track when complaint status changed to resolved
ALTER TABLE public.complaints ADD COLUMN resolved_at timestamp with time zone;

-- Create index for better query performance
CREATE INDEX idx_complaints_resolved_at ON public.complaints(resolved_at);

COMMENT ON COLUMN public.complaints.resolved_at IS 'Timestamp when the complaint status was changed to resolved';