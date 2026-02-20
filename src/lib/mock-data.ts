import type { FileNode, Repository, ChatMessage } from './types';

export const MOCK_REPOSITORIES: Omit<Repository, 'id' | 'user_id' | 'created_at'>[] = [
  { owner: 'gitmind', name: 'core-engine', default_branch: 'main', base_path: '/src' },
  { owner: 'gitmind', name: 'web-client', default_branch: 'main', base_path: '/app' },
  { owner: 'gitmind', name: 'ai-orchestrator', default_branch: 'develop', base_path: '/lib' },
];

export const MOCK_FILE_TREE: FileNode[] = [
  {
    name: 'src',
    path: '/src',
    type: 'folder',
    children: [
      {
        name: 'components',
        path: '/src/components',
        type: 'folder',
        children: [
          { name: 'App.tsx', path: '/src/components/App.tsx', type: 'file', language: 'tsx' },
          { name: 'Header.tsx', path: '/src/components/Header.tsx', type: 'file', language: 'tsx' },
          { name: 'Sidebar.tsx', path: '/src/components/Sidebar.tsx', type: 'file', language: 'tsx' },
        ],
      },
      {
        name: 'lib',
        path: '/src/lib',
        type: 'folder',
        children: [
          { name: 'utils.ts', path: '/src/lib/utils.ts', type: 'file', language: 'ts' },
          { name: 'api.ts', path: '/src/lib/api.ts', type: 'file', language: 'ts' },
        ],
      },
      { name: 'index.ts', path: '/src/index.ts', type: 'file', language: 'ts' },
      { name: 'config.json', path: '/src/config.json', type: 'file', language: 'json' },
    ],
  },
  {
    name: 'tests',
    path: '/tests',
    type: 'folder',
    children: [
      { name: 'app.test.ts', path: '/tests/app.test.ts', type: 'file', language: 'ts' },
    ],
  },
  { name: 'package.json', path: '/package.json', type: 'file', language: 'json' },
  { name: 'README.md', path: '/README.md', type: 'file', language: 'md' },
];

export const MOCK_FILE_CONTENTS: Record<string, string> = {
  '/src/components/App.tsx': `import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface AppProps {
  title: string;
  version: string;
}

export const App: React.FC<AppProps> = ({ title, version }) => {
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    // Initialize application
    console.log(\`\${title} v\${version} initialized\`);
  }, [title, version]);

  return (
    <div className="app-container">
      <Header title={title} />
      <div className="main-content">
        <Sidebar />
        <main>
          {isLoading ? <Spinner /> : <Content />}
        </main>
      </div>
    </div>
  );
};`,
  '/src/lib/utils.ts': `export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function generateId(): string {
  return crypto.randomUUID();
}`,
  '/src/lib/api.ts': `const BASE_URL = '/api/v1';

interface ApiResponse<T> {
  data: T;
  error: string | null;
  status: number;
}

export async function fetchJSON<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(\`\${BASE_URL}\${endpoint}\`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await response.json();
  return { data, error: null, status: response.status };
}`,
  '/src/index.ts': `import { App } from './components/App';

const config = {
  title: 'GitMind Core',
  version: '0.1.0',
  environment: 'development',
};

export default App;`,
  '/src/config.json': `{
  "name": "gitmind-core",
  "version": "0.1.0",
  "features": {
    "ai_orchestration": true,
    "commit_simulation": true,
    "diff_validation": true
  },
  "limits": {
    "max_repos": 5,
    "max_sessions": 1,
    "max_file_size_mb": 10
  }
}`,
  '/package.json': `{
  "name": "gitmind-core-engine",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "lint": "eslint . --ext .ts,.tsx"
  }
}`,
  '/README.md': `# GitMind Core Engine

AI-native GitHub code editing system.

## Architecture

- **UI Layer**: React + TypeScript
- **API Layer**: Edge Functions
- **State Machine**: Backend-driven session states
- **Orchestration**: AI task pipeline
- **Adapters**: GitHub & AI simulation layers`,
  '/src/components/Header.tsx': `import React from 'react';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="header">
      <h1>{title}</h1>
      <nav>
        <a href="/dashboard">Dashboard</a>
        <a href="/settings">Settings</a>
      </nav>
    </header>
  );
};`,
  '/src/components/Sidebar.tsx': `import React from 'react';

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <aside className={collapsed ? 'sidebar collapsed' : 'sidebar'}>
      <button onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? '→' : '←'}
      </button>
      <ul>
        <li>Explorer</li>
        <li>Search</li>
        <li>Git</li>
      </ul>
    </aside>
  );
};`,
  '/tests/app.test.ts': `import { describe, it, expect } from 'vitest';

describe('App', () => {
  it('should initialize correctly', () => {
    expect(true).toBe(true);
  });

  it('should handle state transitions', () => {
    const states = ['IDLE', 'PLANNING', 'EXECUTING', 'DONE'];
    expect(states.length).toBe(4);
  });
});`,
};

export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Welcome to GitMind AI. I can help you analyze and modify code in this repository. What would you like to do?',
    timestamp: new Date(),
  },
];
