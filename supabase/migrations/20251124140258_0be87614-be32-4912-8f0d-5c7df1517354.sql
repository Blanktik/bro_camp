-- Enable realtime for user_moderation table so students get instant notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_moderation;