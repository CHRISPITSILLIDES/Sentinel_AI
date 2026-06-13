import { FormEvent, useEffect, useRef, useState } from 'react';
import { Loader2, RotateCcw, Send, Shield, Sparkles } from 'lucide-react';
import { askAdvisor, AdvisorMessage } from '../../lib/advisor';
import { readStoredValue, usePersistentState } from '../../lib/storage';
import type { DecisionResult } from '../../lib/decisionEngine';
import type { CategoryLimit, Goal, ShieldRule } from '../../stores/appStore';
import { mockCategoryLimits, mockGoals, mockShieldRules } from '../../stores/appStore';
import { Button } from '../ui/Button';
import { GlassCard } from '../ui/GlassCard';

interface ChatMessage extends AdvisorMessage {
  id: string;
  source?: 'Local open-source AI' | 'Instant offline guide';
}

const welcome: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hi, I am NataGuide. I can help turn a money question into practical next steps. Try asking about a budget, savings goal, suspicious payment, debt plan, or investing basics.',
  source: 'Instant offline guide',
};

const prompts = [
  'Help me build a monthly budget',
  'How large should my emergency fund be?',
  'Create a safe debt payoff plan',
  'How can I check a suspicious payment?',
];

export function GuideDashboard() {
  const [messages, setMessages] = usePersistentState<ChatMessage[]>('guide-messages', [welcome]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, isLoading]);

  const sendMessage = async (content: string) => {
    const question = content.trim();
    if (!question || isLoading) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: question };
    const conversation = [...messages.filter(message => message.id !== 'welcome'), userMessage];
    setMessages(previous => [...previous, userMessage]);
    setInput('');
    setIsLoading(true);
    setLoadingProgress('Starting local advisor...');

    try {
      const goals = readStoredValue<Goal[]>('goals', mockGoals);
      const rules = readStoredValue<ShieldRule[]>('shield-rules', mockShieldRules);
      const limits = readStoredValue<CategoryLimit[]>('category-limits', mockCategoryLimits);
      const latest = readStoredValue<DecisionResult | null>('latest-decision', null);
      const contextSummary = [
        `Goals: ${goals.map(goal => `${goal.name} EUR ${goal.currentAmount}/${goal.targetAmount}${goal.isShieldProtected ? ' protected' : ''}`).join('; ')}`,
        `Active rules: ${rules.filter(rule => rule.isActive).map(rule => rule.ruleText).join('; ') || 'none'}`,
        `Category limits: ${limits.filter(limit => limit.isActive).map(limit => `${limit.category} EUR ${limit.currentSpent}/${limit.monthlyLimit}`).join('; ')}`,
        latest ? `Latest decision: ${latest.input.sellerName}, EUR ${latest.input.amount}, risk ${latest.score}/100, recommended ${latest.action}. Evidence: ${latest.evidence.map(item => item.label).join(', ') || 'none'}` : 'Latest decision: none',
      ].join('\n');
      const answer = await askAdvisor(
        conversation.slice(-10).map(({ role, content: messageContent }) => ({ role, content: messageContent })),
        { summary: contextSummary },
        setLoadingProgress,
      );
      setMessages(previous => [...previous, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: answer.content,
        source: answer.source,
      }]);
    } finally {
      setIsLoading(false);
      setLoadingProgress('');
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const resetChat = () => {
    setMessages([welcome]);
    setIsLoading(false);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">NataGuide</h1>
          <p className="text-sm text-slate-400 mt-0.5">Practical financial education with a private offline fallback.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={resetChat} disabled={isLoading}>
          <RotateCcw size={14} /> New chat
        </Button>
      </div>

      <GlassCard className="p-3">
        <div className="flex items-start gap-2"><Shield size={15} className="text-blue-300 mt-0.5" /><p className="text-xs text-slate-400">NataGuide can use your locally saved goals, limits, active rules, and latest payment analysis. It does not receive card numbers or authentication data.</p></div>
      </GlassCard>

      <GlassCard className="p-4 space-y-4 h-[28rem] overflow-y-auto" gradient>
        {messages.map(message => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-2xl ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-slate-800/90 border border-slate-700 flex items-center justify-center shrink-0 mt-1">
                  <Shield size={16} className="text-slate-300" />
                </div>
              )}
              <div className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${message.role === 'user' ? 'bg-blue-600/80 text-white rounded-br-none' : 'bg-slate-900/80 border border-slate-700 text-slate-100 rounded-bl-none'}`}>
                {message.content}
                {message.source && (
                  <div className="mt-2 text-[10px] uppercase tracking-wide text-slate-500 flex items-center gap-1">
                    <Sparkles size={10} /> {message.source}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin" /> {loadingProgress || 'NataGuide is preparing a careful answer...'}
          </div>
        )}
        <div ref={endRef} />
      </GlassCard>

      {messages.length === 1 && (
        <div className="flex flex-wrap gap-2">
          {prompts.map(prompt => (
            <button key={prompt} onClick={() => void sendMessage(prompt)} className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-300 hover:border-slate-500 hover:text-white">
              {prompt}
            </button>
          ))}
        </div>
      )}

      <form className="flex gap-2" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder="Ask a financial question without sharing sensitive data..."
          maxLength={2000}
          className="flex-1 bg-slate-900/50 border border-slate-700 rounded-full px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-slate-500 transition-colors"
        />
        <Button variant="primary" size="md" disabled={!input.trim() || isLoading} className="rounded-full px-4">
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </Button>
      </form>
      <p className="text-xs text-slate-500">The optional AI runs on your device with WebGPU. Its model downloads once and is cached by the browser. The instant offline guide remains available on unsupported devices. Educational guidance only.</p>
    </div>
  );
}
