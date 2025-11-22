-- Fix function search path for security
CREATE OR REPLACE FUNCTION public.update_admin_status_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_seen = now();
  RETURN NEW;
END;
$$;