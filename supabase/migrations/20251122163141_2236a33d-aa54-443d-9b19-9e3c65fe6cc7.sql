-- Add voice_note_url column to complaints table
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS voice_note_url TEXT;