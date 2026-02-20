// Core domain types for GitMind AI

export type SessionState = 'IDLE' | 'PLANNING' | 'EXECUTING' | 'DONE' | 'FAILED';
export type SessionMode = 'chat' | 'action';
export type AiTaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface User {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Repository {
  id: string;
  user_id: string;
  owner: string;
  name: string;
  default_branch: string;
  base_path: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  repo_id: string;
  mode: SessionMode;
  state: SessionState;
  created_at: string;
  updated_at: string;
}

export interface AiTask {
  id: string;
  session_id: string;
  intent_type: string;
  compiled_prompt_hash: string | null;
  status: AiTaskStatus;
  result: Record<string, unknown> | null;
  created_at: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  language?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// State machine valid transitions
export const VALID_TRANSITIONS: Record<SessionState, SessionState[]> = {
  IDLE: ['PLANNING'],
  PLANNING: ['EXECUTING', 'FAILED'],
  EXECUTING: ['DONE', 'FAILED'],
  DONE: ['IDLE'],
  FAILED: ['IDLE'],
};
