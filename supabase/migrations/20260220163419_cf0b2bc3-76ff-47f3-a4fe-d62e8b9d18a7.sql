
-- Create enum for session states
CREATE TYPE public.session_state AS ENUM ('IDLE', 'PLANNING', 'EXECUTING', 'DONE', 'FAILED');

-- Create enum for AI task status
CREATE TYPE public.ai_task_status AS ENUM ('pending', 'running', 'completed', 'failed');

-- Create enum for session mode
CREATE TYPE public.session_mode AS ENUM ('chat', 'action');

-- Users table
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- For personal use: allow all operations (single user)
CREATE POLICY "Allow all for users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- Repositories table
CREATE TABLE public.repositories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  default_branch TEXT NOT NULL DEFAULT 'main',
  base_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for repositories" ON public.repositories FOR ALL USING (true) WITH CHECK (true);

-- Sessions table
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  mode public.session_mode NOT NULL DEFAULT 'chat',
  state public.session_state NOT NULL DEFAULT 'IDLE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for sessions" ON public.sessions FOR ALL USING (true) WITH CHECK (true);

-- AI Tasks table
CREATE TABLE public.ai_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  intent_type TEXT NOT NULL,
  compiled_prompt_hash TEXT,
  status public.ai_task_status NOT NULL DEFAULT 'pending',
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for ai_tasks" ON public.ai_tasks FOR ALL USING (true) WITH CHECK (true);

-- Trigger for sessions updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
