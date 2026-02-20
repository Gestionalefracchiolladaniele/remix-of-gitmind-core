import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, Plus, Clock, ArrowRight, LogOut, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MOCK_REPOSITORIES } from '@/lib/mock-data';

interface RepoCard {
  id: string;
  owner: string;
  name: string;
  default_branch: string;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [repos, setRepos] = useState<RepoCard[]>([]);

  useEffect(() => {
    const user = localStorage.getItem('gitmind_user');
    if (!user) {
      navigate('/');
      return;
    }
    // Simulate loading repos
    const mockRepos: RepoCard[] = MOCK_REPOSITORIES.map((r, i) => ({
      id: `repo-${i + 1}`,
      ...r,
      created_at: new Date(Date.now() - i * 86400000 * 3).toISOString(),
    }));
    setRepos(mockRepos);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('gitmind_user');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <GitBranch className="h-5 w-5 text-primary" />
            <span className="font-mono font-semibold text-foreground">GitMind AI</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground">
              <Database className="h-3 w-3" />
              <span>{repos.length}/5 repos</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Repositories</h1>
            <p className="mt-1 text-sm text-muted-foreground">Select a repository to open the workspace</p>
          </div>
          <Button
            disabled={repos.length >= 5}
            className="transition-default"
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Attach Repository
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {repos.map((repo, i) => (
            <button
              key={repo.id}
              onClick={() => navigate(`/workspace/${repo.id}`)}
              className="group glass-panel rounded-xl p-5 text-left transition-default hover:border-primary/30 hover:bg-panel-hover animate-fade-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <GitBranch className="h-5 w-5 text-primary" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-default group-hover:opacity-100 group-hover:translate-x-0.5" />
              </div>

              <h3 className="font-mono text-sm font-medium text-foreground">
                {repo.owner}/{repo.name}
              </h3>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  {repo.default_branch}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(repo.created_at).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
