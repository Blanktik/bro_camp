-- Create calls table for tracking call history and state
CREATE TABLE public.calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  admin_id UUID,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  has_video BOOLEAN DEFAULT false,
  has_screen_share BOOLEAN DEFAULT false,
  student_notes TEXT,
  admin_notes TEXT
);

-- Create admin_settings table for DND mode
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL UNIQUE,
  dnd_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create call_signals table for WebRTC signaling
CREATE TABLE public.call_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  signal_type TEXT NOT NULL,
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calls
CREATE POLICY "Students can create calls"
  ON public.calls FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can view own calls"
  ON public.calls FOR SELECT
  USING (student_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins can update calls"
  ON public.calls FOR UPDATE
  USING (is_admin(auth.uid()));

-- RLS Policies for admin_settings
CREATE POLICY "Admins can manage own settings"
  ON public.admin_settings FOR ALL
  USING (admin_id = auth.uid() AND is_admin(auth.uid()));

CREATE POLICY "Anyone can view admin settings"
  ON public.admin_settings FOR SELECT
  USING (true);

-- RLS Policies for call_signals
CREATE POLICY "Users can create signals"
  ON public.call_signals FOR INSERT
  WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "Users can view signals for their calls"
  ON public.call_signals FOR SELECT
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Users can delete own signals"
  ON public.call_signals FOR DELETE
  USING (from_user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;

-- Create trigger for updated_at
CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_calls_updated_at
  BEFORE UPDATE ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();