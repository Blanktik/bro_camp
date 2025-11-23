-- Add admin voice note support to complaints table
ALTER TABLE public.complaints 
ADD COLUMN admin_voice_note_url TEXT;