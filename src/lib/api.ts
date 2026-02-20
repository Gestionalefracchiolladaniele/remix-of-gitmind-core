import { supabase } from '@/integrations/supabase/client';
import type { Session, SessionState, Repository } from './types';

const EDGE_URL = `https://agtwmliibgwoaqzpdzoo.supabase.co/functions/v1`;

async function callEdge<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${EDGE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? ''}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  // Session
  createSession: (repoId: string, mode: 'chat' | 'action') =>
    callEdge<{ session: Session }>('/gitmind-api', { action: 'session.create', repoId, mode }),
  
  getSession: (sessionId: string) =>
    callEdge<{ session: Session }>('/gitmind-api', { action: 'session.get', sessionId }),

  // Repository
  attachRepo: (owner: string, name: string) =>
    callEdge<{ repository: Repository }>('/gitmind-api', { action: 'repo.attach', owner, name }),

  selectFiles: (sessionId: string, paths: string[]) =>
    callEdge<{ files: { path: string; content: string }[] }>('/gitmind-api', { action: 'repo.selectFiles', sessionId, paths }),

  // AI Orchestration
  normalizeIntent: (sessionId: string, input: string) =>
    callEdge<{ intentType: string; confidence: number }>('/gitmind-api', { action: 'ai.normalize', sessionId, input }),

  compileTask: (sessionId: string, intentType: string) =>
    callEdge<{ task: Record<string, unknown> }>('/gitmind-api', { action: 'ai.compile', sessionId, intentType }),

  executeAi: (sessionId: string, taskId: string) =>
    callEdge<{ patches: string[] }>('/gitmind-api', { action: 'ai.execute', sessionId, taskId }),

  // Diff & Commit
  validateDiff: (patch: string) =>
    callEdge<{ valid: boolean; errors: string[] }>('/gitmind-api', { action: 'diff.validate', patch }),

  simulateCommit: (sessionId: string, patches: string[]) =>
    callEdge<{ commitHash: string; message: string }>('/gitmind-api', { action: 'commit.simulate', sessionId, patches }),

  // State transitions
  transitionState: (sessionId: string, newState: SessionState) =>
    callEdge<{ session: Session }>('/gitmind-api', { action: 'session.transition', sessionId, newState }),
};
