
-- Create chat_messages table for persistent chat history
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  file_context JSONB DEFAULT NULL, -- snapshot of open files at message time
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast session-based lookups
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(session_id, created_at);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow all operations through edge functions (service role)
-- Public read for messages linked to user's sessions
CREATE POLICY "Users can view their chat messages"
  ON public.chat_messages FOR SELECT
  USING (
    session_id IN (
      SELECT s.id FROM public.sessions s
      JOIN public.repositories r ON s.repo_id = r.id
      JOIN public.users u ON r.user_id = u.id
    )
  );

-- Allow insert (via edge function service role primarily)
CREATE POLICY "Allow insert chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (true);

-- Allow delete for revert functionality
CREATE POLICY "Allow delete chat messages"
  ON public.chat_messages FOR DELETE
  USING (true);
