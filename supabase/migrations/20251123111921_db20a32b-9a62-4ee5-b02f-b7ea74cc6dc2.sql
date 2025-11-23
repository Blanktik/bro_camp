-- Add soft delete columns to complaints table
ALTER TABLE public.complaints
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Update the delete policy to perform soft deletes instead
DROP POLICY IF EXISTS "Users and admins can delete complaints" ON public.complaints;

-- Create policy for soft delete (UPDATE operation since we're just marking as deleted)
CREATE POLICY "Users and admins can soft delete complaints" 
ON public.complaints 
FOR UPDATE 
USING (
  ((user_id = auth.uid()) AND (viewed_at IS NULL) AND (admin_response IS NULL))
  OR is_admin(auth.uid())
);

-- Create policy for permanent delete (only admins from archive)
CREATE POLICY "Admins can permanently delete complaints" 
ON public.complaints 
FOR DELETE 
USING (is_admin(auth.uid()) AND deleted = true);