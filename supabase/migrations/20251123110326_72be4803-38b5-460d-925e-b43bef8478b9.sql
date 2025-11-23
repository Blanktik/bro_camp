-- Drop the existing delete policy
DROP POLICY IF EXISTS "Users can delete own unviewed complaints" ON public.complaints;

-- Create new policy that allows users to delete their own unviewed complaints
-- AND allows admins to delete any complaint
CREATE POLICY "Users and admins can delete complaints" 
ON public.complaints 
FOR DELETE 
USING (
  ((user_id = auth.uid()) AND (viewed_at IS NULL) AND (admin_response IS NULL))
  OR is_admin(auth.uid())
);