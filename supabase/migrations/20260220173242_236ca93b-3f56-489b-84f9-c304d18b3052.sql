
-- Add GitHub-specific columns to users table for OAuth
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS github_id text UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS github_token text;

-- Update state machine transitions: allow SPEC_LOCKED and VALIDATING flows
-- Already added to enum in previous migration, just ensuring
