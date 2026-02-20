import { useState } from 'react';
import { Send, Zap, MessageSquare, Play, Loader2, Bot, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import type { ChatMessage, SessionState, Session, Repository } from '@/lib/types';

interface AiPanelProps {
  sessionState: SessionState;
  onStateChange: (state: SessionState) => void;
  session: Session | null;
  repo: Repository | null;
  userId: string;
  openFiles: string[];
  fileContents: Record<string, string>;
}

const AiPanel = ({ sessionState, onStateChange, session, repo, userId, openFiles, fileContents }: AiPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'assistant', content: 'Welcome to GitMind AI. Ask me about your codebase or describe a code change to execute.', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [actionInput, setActionInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [executionResult, setExecutionResult] = useState<{ patches: string; commitMessage: string } | null>(null);

  // --- AI Chat ---
  const handleSendChat = async () => {
    if (!input.trim() || isChatting) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsChatting(true);

    try {
      // Build file context from open files
      const fileCtx = openFiles
        .filter(f => fileContents[f])
        .map(f => `--- ${f} ---\n${fileContents[f]}`)
        .join('\n\n');

      const chatMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const { reply } = await api.aiChat(chatMessages, fileCtx || undefined);

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      }]);
    } catch (e: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${e.message}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsChatting(false);
    }
  };

  // --- AI Action Pipeline ---
  const handleExecuteAction = async () => {
    if (!actionInput.trim() || isProcessing || !session || !repo) return;
    setIsProcessing(true);
    setExecutionResult(null);

    try {
      // Step 1: Normalize intent
      onStateChange('PLANNING');
      const intent = await api.normalizeIntent(actionInput);

      // Step 2: Compile task with open files
      const filesToSend = openFiles
        .filter(f => fileContents[f])
        .map(f => ({ path: f, content: fileContents[f] }));

      if (filesToSend.length === 0) {
        throw new Error('Open at least one file before executing an action.');
      }

      // Step 3: Execute AI
      onStateChange('EXECUTING');
      const result = await api.executeAi({
        sessionId: session.id,
        intentType: intent.intentType,
        files: filesToSend,
        userPrompt: actionInput,
      });

      // Step 4: Validate
      onStateChange('VALIDATING');
      const validation = await api.validateDiff(result.patches, filesToSend.map(f => f.path), repo.base_path || undefined);

      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      setExecutionResult(result);
      onStateChange('DONE');
      setActionInput('');
    } catch (e: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Action failed: ${e.message}`,
        timestamp: new Date(),
      }]);
      onStateChange('FAILED');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <Tabs defaultValue="chat" className="flex h-full flex-col">
        <div className="border-b border-border px-3">
          <TabsList className="h-10 bg-transparent p-0 gap-1">
            <TabsTrigger value="chat" className="h-8 rounded-md px-3 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="action" className="h-8 rounded-md px-3 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              Action
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Chat Tab */}
        <TabsContent value="chat" className="flex-1 flex flex-col mt-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`animate-fade-in ${msg.role === 'user' ? 'ml-6' : 'mr-6'}`}>
                <div className={`rounded-lg p-3 text-xs leading-relaxed ${
                  msg.role === 'user' ? 'bg-primary/10 text-foreground' : 'bg-secondary/50 text-foreground'
                }`}>
                  {msg.role === 'assistant' && <Bot className="inline h-3 w-3 mr-1 text-primary" />}
                  <pre className="whitespace-pre-wrap font-mono">{msg.content}</pre>
                </div>
              </div>
            ))}
            {isChatting && (
              <div className="mr-6 animate-fade-in">
                <div className="rounded-lg bg-secondary/50 p-3 text-xs">
                  <Loader2 className="h-3 w-3 animate-spin text-primary inline mr-1" />
                  <span className="text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                placeholder="Ask about this codebase..."
                className="h-9 text-xs bg-secondary/50"
                disabled={isChatting}
              />
              <Button size="sm" onClick={handleSendChat} className="h-9 px-3" disabled={isChatting}>
                {isChatting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Action Tab */}
        <TabsContent value="action" className="flex-1 flex flex-col mt-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4">
            {/* State indicator */}
            <div className="glass-panel rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Session State</span>
                <StateIndicator state={sessionState} />
              </div>
              <div className="flex gap-1.5">
                {(['IDLE', 'PLANNING', 'EXECUTING', 'VALIDATING', 'DONE'] as SessionState[]).map(s => (
                  <div key={s} className={`h-1.5 flex-1 rounded-full transition-default ${
                    s === sessionState ? 'bg-primary' :
                    getStateOrder(s) < getStateOrder(sessionState) ? 'bg-primary/40' : 'bg-border'
                  }`} />
                ))}
              </div>
            </div>

            {/* Pipeline info */}
            <div className="rounded-lg bg-secondary/30 p-3 text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">AI Action Pipeline</p>
              <ol className="list-decimal list-inside space-y-1">
                <li className={sessionState === 'PLANNING' ? 'text-primary font-medium' : ''}>Normalize intent (deterministic)</li>
                <li className={sessionState === 'EXECUTING' ? 'text-primary font-medium' : ''}>AI generate patches (Gemini Flash)</li>
                <li className={sessionState === 'VALIDATING' ? 'text-primary font-medium' : ''}>Validate diffs & security</li>
                <li className={sessionState === 'DONE' ? 'text-primary font-medium' : ''}>Review & commit</li>
              </ol>
            </div>

            {/* Open files context */}
            {openFiles.length > 0 && (
              <div className="rounded-lg bg-secondary/30 p-3 text-xs">
                <p className="text-muted-foreground mb-1.5">Context ({openFiles.length} files):</p>
                {openFiles.map(f => (
                  <p key={f} className="font-mono text-foreground/70 truncate">{f}</p>
                ))}
              </div>
            )}

            {/* Execution result */}
            {executionResult && (
              <div className="animate-slide-in-right rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-medium text-primary">Execution Complete</p>
                </div>
                <p className="text-xs text-muted-foreground font-mono">{executionResult.commitMessage}</p>
                <pre className="text-[10px] text-foreground/60 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto bg-background/50 rounded p-2">
                  {executionResult.patches}
                </pre>
              </div>
            )}

            {sessionState === 'FAILED' && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  <p className="text-xs font-medium text-destructive">Execution Failed</p>
                </div>
                <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={() => onStateChange('IDLE')}>
                  Reset to IDLE
                </Button>
              </div>
            )}
          </div>

          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <Input
                value={actionInput}
                onChange={e => setActionInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleExecuteAction()}
                placeholder="Describe code change..."
                className="h-9 text-xs bg-secondary/50"
                disabled={isProcessing}
              />
              <Button
                size="sm"
                onClick={handleExecuteAction}
                disabled={isProcessing || !actionInput.trim()}
                className="h-9 px-3"
              >
                {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const StateIndicator = ({ state }: { state: SessionState }) => {
  const colors: Record<SessionState, string> = {
    IDLE: 'bg-muted-foreground',
    PLANNING: 'bg-yellow-500',
    SPEC_LOCKED: 'bg-orange-500',
    EXECUTING: 'bg-blue-500 animate-pulse-glow',
    VALIDATING: 'bg-cyan-500 animate-pulse-glow',
    DONE: 'bg-emerald-500',
    FAILED: 'bg-destructive',
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2 w-2 rounded-full ${colors[state]}`} />
      <span className="text-xs font-mono text-muted-foreground">{state}</span>
    </div>
  );
};

function getStateOrder(state: SessionState): number {
  const order: Record<SessionState, number> = {
    IDLE: 0, PLANNING: 1, SPEC_LOCKED: 2, EXECUTING: 3, VALIDATING: 4, DONE: 5, FAILED: 6,
  };
  return order[state];
}

export default AiPanel;
