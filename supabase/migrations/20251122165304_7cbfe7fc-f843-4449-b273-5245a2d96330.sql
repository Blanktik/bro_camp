-- Add admin tracking to complaints table
ALTER TABLE public.complaints 
ADD COLUMN admin_id uuid REFERENCES auth.users(id),
ADD COLUMN responded_at timestamp with time zone;

-- Create index for better query performance
CREATE INDEX idx_complaints_admin_id ON public.complaints(admin_id);