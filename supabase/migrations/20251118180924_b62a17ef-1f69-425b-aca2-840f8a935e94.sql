-- Drop existing policy for creating complaints
DROP POLICY IF EXISTS "Users can create complaints" ON public.complaints;

-- Create new policy that allows both authenticated and anonymous complaints
CREATE POLICY "Users can create complaints" 
ON public.complaints 
FOR INSERT 
WITH CHECK (
  -- Allow if user_id matches auth.uid() for authenticated complaints
  (user_id = auth.uid()) 
  OR 
  -- Allow if it's anonymous (user_id is null and is_anonymous is true)
  (is_anonymous = true AND user_id IS NULL)
);