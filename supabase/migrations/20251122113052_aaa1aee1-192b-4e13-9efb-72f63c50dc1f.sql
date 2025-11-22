-- Add email column to profiles table
ALTER TABLE public.profiles ADD COLUMN email text;

-- Create index for better query performance
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Update the handle_new_user function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert profile with email
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), NEW.email);
  
  -- Assign student role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$function$;

-- Backfill existing profiles with emails from auth.users
UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE profiles.id = auth.users.id AND profiles.email IS NULL;