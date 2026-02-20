import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, Zap, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AuthPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSimulatedLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      localStorage.setItem('gitmind_user', JSON.stringify({ id: 'user-1', name: 'Developer' }));
      navigate('/dashboard');
    }, 800);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/3 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 h-64 w-64 rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6 animate-fade-in">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 glow-accent">
            <GitBranch className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground font-mono">
            GitMind AI
          </h1>
          <p className="text-muted-foreground">
            AI-native code editing platform
          </p>
        </div>

        <div className="glass-panel rounded-xl p-6 space-y-6">
          <div className="space-y-4">
            <Feature icon={Zap} text="AI-powered code orchestration" />
            <Feature icon={Shield} text="Deterministic intent classification" />
            <Feature icon={GitBranch} text="Simulated commit engine" />
          </div>

          <Button
            onClick={handleSimulatedLogin}
            disabled={isLoading}
            className="w-full h-12 text-base font-medium transition-default glow-accent hover:glow-accent-strong"
          >
            {isLoading ? (
              <span className="animate-pulse-glow">Authenticating...</span>
            ) : (
              <>
                Enter Platform
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Simulated authentication · GitHub OAuth placeholder
          </p>
        </div>
      </div>
    </div>
  );
};

const Feature = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex items-center gap-3 text-sm">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <span className="text-muted-foreground">{text}</span>
  </div>
);

export default AuthPage;
