
-- Phase 1: Expand enums, add columns, create new tables

-- 1. Add 'autonomous' to session_mode enum
ALTER TYPE session_mode ADD VALUE IF NOT EXISTS 'autonomous';

-- 2. Add 'SPEC_LOCKED' and 'VALIDATING' to session_state enum
ALTER TYPE session_state ADD VALUE IF NOT EXISTS 'SPEC_LOCKED';
ALTER TYPE session_state ADD VALUE IF NOT EXISTS 'VALIDATING';

-- 3. Add github_repo_id to repositories
ALTER TABLE public.repositories ADD COLUMN IF NOT EXISTS github_repo_id text;

-- 4. Add retry_count to ai_tasks
ALTER TABLE public.ai_tasks ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;

-- 5. Create autonomous_specs table
CREATE TABLE IF NOT EXISTS public.autonomous_specs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  spec_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.autonomous_specs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for autonomous_specs"
  ON public.autonomous_specs
  AS RESTRICTIVE
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  action text NOT NULL,
  duration_ms integer,
  retry_count integer DEFAULT 0,
  error_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for activity_logs"
  ON public.activity_logs
  AS RESTRICTIVE
  FOR ALL
  USING (true)
  WITH CHECK (true);
