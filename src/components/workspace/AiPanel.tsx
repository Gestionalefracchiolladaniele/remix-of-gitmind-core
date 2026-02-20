import { useState } from 'react';
import { Send, Zap, MessageSquare, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MOCK_CHAT_MESSAGES } from '@/lib/mock-data';
import type { ChatMessage, SessionState } from '@/lib/types';

interface AiPanelProps {
  sessionState: SessionState;
  onStateChange: (state: SessionState) => void;
}

const AiPanel = ({ sessionState, onStateChange }: AiPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_CHAT_MESSAGES);
  const [input, setInput] = useState('');
  const [actionInput, setActionInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSendChat = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Simulate AI response
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Analyzed: "${userMsg.content}"\n\nIntent classified as: refactor_component\nConfidence: 0.92\n\nI can generate a structured task for this. Switch to Action mode to execute.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 1200);
  };

  const handleExecuteAction = () => {
    if (!actionInput.trim()) return;
    setIsProcessing(true);
    onStateChange('PLANNING');

    setTimeout(() => {
      onStateChange('EXECUTING');
      setTimeout(() => {
        onStateChange('DONE');
        setIsProcessing(false);
        setActionInput('');
      }, 2000);
    }, 1500);
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <Tabs defaultValue="chat" className="flex h-full flex-col">
        <div className="border-b border-border px-3">
          <TabsList className="h-10 bg-transparent p-0 gap-1">
            <TabsTrigger
              value="chat"
              className="h-8 rounded-md px-3 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              Chat
            </TabsTrigger>
            <TabsTrigger
              value="action"
              className="h-8 rounded-md px-3 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              Action
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 flex flex-col mt-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`animate-fade-in ${msg.role === 'user' ? 'ml-6' : 'mr-6'}`}
              >
                <div
                  className={`rounded-lg p-3 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary/10 text-foreground'
                      : 'bg-secondary/50 text-foreground'
                  }`}
                >
                  <pre className="whitespace-pre-wrap font-mono">{msg.content}</pre>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                placeholder="Ask about this codebase..."
                className="h-9 text-xs bg-secondary/50"
              />
              <Button size="sm" onClick={handleSendChat} className="h-9 px-3">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="action" className="flex-1 flex flex-col mt-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4">
            {/* State indicator */}
            <div className="glass-panel rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Session State</span>
                <StateIndicator state={sessionState} />
              </div>
              <div className="flex gap-1.5">
                {(['IDLE', 'PLANNING', 'EXECUTING', 'DONE', 'FAILED'] as SessionState[]).map(s => (
                  <div
                    key={s}
                    className={`h-1.5 flex-1 rounded-full transition-default ${
                      s === sessionState ? 'bg-primary' :
                      getStateOrder(s) < getStateOrder(sessionState) ? 'bg-primary/40' :
                      'bg-border'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Action description */}
            <div className="rounded-lg bg-secondary/30 p-3 text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">AI Action Pipeline</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Normalize intent from natural language</li>
                <li>Compile structured task</li>
                <li>Execute & generate patches</li>
                <li>Validate diffs</li>
                <li>Simulate commit</li>
              </ol>
            </div>

            {sessionState === 'DONE' && (
              <div className="animate-slide-in-right rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs font-medium text-primary mb-1">✓ Execution Complete</p>
                <p className="text-xs text-muted-foreground font-mono">
                  commit: a3f7b2c · "Refactor component structure"
                </p>
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
                {isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
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
    EXECUTING: 'bg-blue-500 animate-pulse-glow',
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
  const order: Record<SessionState, number> = { IDLE: 0, PLANNING: 1, EXECUTING: 2, DONE: 3, FAILED: 4 };
  return order[state];
}

export default AiPanel;
