-- Create user moderation table
CREATE TABLE public.user_moderation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  moderation_type TEXT NOT NULL CHECK (moderation_type IN ('warning', 'timeout', 'ban')),
  reason TEXT NOT NULL,
  issued_by UUID NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_moderation ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all moderation records"
  ON public.user_moderation
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create moderation records"
  ON public.user_moderation
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update moderation records"
  ON public.user_moderation
  FOR UPDATE
  USING (is_admin(auth.uid()));

-- Add need_more_info status support to complaints
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS admin_info_request TEXT;

-- Create function to count user warnings
CREATE OR REPLACE FUNCTION public.get_user_warning_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.user_moderation
  WHERE user_id = user_uuid 
    AND moderation_type = 'warning'
    AND is_active = true
$$;

-- Create function to check if user is banned
CREATE OR REPLACE FUNCTION public.is_user_banned(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_moderation
    WHERE user_id = user_uuid 
      AND moderation_type = 'ban'
      AND is_active = true
  )
$$;

-- Create function to check if user is timed out
CREATE OR REPLACE FUNCTION public.is_user_timed_out(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_moderation
    WHERE user_id = user_uuid 
      AND moderation_type = 'timeout'
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;