-- Create calls table for student-to-admin calls
CREATE TABLE public.calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  call_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, completed, missed
  voice_note_url TEXT,
  attended_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  attended_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create admin_status table to track online/offline and DND
CREATE TABLE public.admin_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL UNIQUE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  is_dnd BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for calls
CREATE POLICY "Students can create calls"
ON public.calls
FOR INSERT
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can view their own calls"
ON public.calls
FOR SELECT
USING (student_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins can update calls"
ON public.calls
FOR UPDATE
USING (is_admin(auth.uid()));

-- RLS policies for admin_status
CREATE POLICY "Admins can manage their own status"
ON public.admin_status
FOR ALL
USING (admin_id = auth.uid());

CREATE POLICY "Anyone can view admin status"
ON public.admin_status
FOR SELECT
USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_status;

-- Create function to update admin status timestamp
CREATE OR REPLACE FUNCTION public.update_admin_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_seen = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_status_timestamp
BEFORE UPDATE ON public.admin_status
FOR EACH ROW
EXECUTE FUNCTION public.update_admin_status_timestamp();