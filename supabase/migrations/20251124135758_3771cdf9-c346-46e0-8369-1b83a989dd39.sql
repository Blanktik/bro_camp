-- Add appeal functionality to user_moderation table
ALTER TABLE public.user_moderation
ADD COLUMN IF NOT EXISTS appeal_text text,
ADD COLUMN IF NOT EXISTS appeal_submitted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS appeal_reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS appeal_reviewed_by uuid,
ADD COLUMN IF NOT EXISTS appeal_status text CHECK (appeal_status IN ('pending', 'approved', 'rejected'));