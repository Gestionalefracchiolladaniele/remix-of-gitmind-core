import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GitBranch, ArrowLeft, PanelLeftClose, PanelRightClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FileExplorer from '@/components/workspace/FileExplorer';
import CodeViewer from '@/components/workspace/CodeViewer';
import AiPanel from '@/components/workspace/AiPanel';
import { MOCK_REPOSITORIES } from '@/lib/mock-data';
import type { SessionState } from '@/lib/types';

const Workspace = () => {
  const navigate = useNavigate();
  const { repoId } = useParams();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [sessionState, setSessionState] = useState<SessionState>('IDLE');
  const [showExplorer, setShowExplorer] = useState(true);
  const [showAiPanel, setShowAiPanel] = useState(true);

  const repoIndex = parseInt(repoId?.replace('repo-', '') || '1') - 1;
  const repo = MOCK_REPOSITORIES[repoIndex] || MOCK_REPOSITORIES[0];

  useEffect(() => {
    const user = localStorage.getItem('gitmind_user');
    if (!user) navigate('/');
  }, [navigate]);

  const handleFileSelect = useCallback((path: string) => {
    setSelectedFile(path);
    setOpenFiles(prev => prev.includes(path) ? prev : [...prev, path]);
  }, []);

  const handleCloseTab = useCallback((path: string) => {
    setOpenFiles(prev => {
      const next = prev.filter(p => p !== path);
      if (selectedFile === path) {
        setSelectedFile(next[next.length - 1] || null);
      }
      return next;
    });
  }, [selectedFile]);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-card/50 px-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center gap-2 text-xs">
            <GitBranch className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono text-foreground">{repo.owner}/{repo.name}</span>
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {repo.default_branch}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <StateIndicatorCompact state={sessionState} />
          <Button
            variant="ghost" size="sm" className="h-7 w-7 p-0"
            onClick={() => setShowExplorer(!showExplorer)}
          >
            <PanelLeftClose className={`h-3.5 w-3.5 transition-default ${!showExplorer ? 'opacity-40' : ''}`} />
          </Button>
          <Button
            variant="ghost" size="sm" className="h-7 w-7 p-0"
            onClick={() => setShowAiPanel(!showAiPanel)}
          >
            <PanelRightClose className={`h-3.5 w-3.5 transition-default ${!showAiPanel ? 'opacity-40' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Main 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer */}
        {showExplorer && (
          <div className="w-60 shrink-0 border-r border-border animate-slide-in-right">
            <FileExplorer onFileSelect={handleFileSelect} selectedFile={selectedFile} />
          </div>
        )}

        {/* Code Viewer */}
        <div className="flex-1 min-w-0">
          <CodeViewer
            openFiles={openFiles}
            activeFile={selectedFile}
            onSelectTab={setSelectedFile}
            onCloseTab={handleCloseTab}
          />
        </div>

        {/* AI Panel */}
        {showAiPanel && (
          <div className="w-80 shrink-0 border-l border-border animate-slide-in-right">
            <AiPanel sessionState={sessionState} onStateChange={setSessionState} />
          </div>
        )}
      </div>
    </div>
  );
};

const StateIndicatorCompact = ({ state }: { state: SessionState }) => {
  const colors: Record<SessionState, string> = {
    IDLE: 'bg-muted-foreground',
    PLANNING: 'bg-yellow-500',
    EXECUTING: 'bg-blue-500 animate-pulse-glow',
    DONE: 'bg-emerald-500',
    FAILED: 'bg-destructive',
  };

  return (
    <div className="flex items-center gap-1.5 rounded bg-secondary/50 px-2 py-1 mr-2">
      <div className={`h-1.5 w-1.5 rounded-full ${colors[state]}`} />
      <span className="text-[10px] font-mono text-muted-foreground">{state}</span>
    </div>
  );
};

export default Workspace;
