import { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Shield, Send, Settings, ArrowRight } from 'lucide-react';
import { askNataGuide, loadNataAIConfig } from '../../api/ai';
import { piAPI } from '../../api/pi';

interface ChatMessage {
  role: 'user' | 'guide';
  content: string;
}

interface GuideDashboardProps {
  currentMemberId?: string | null;
  onNavigate?: (pillar: 'account') => void;
}

const SYSTEM_PROMPT_BASE =
  `You are NataGuide, a personal financial buddy inside NataConnect — a privacy-first finance app running on a Raspberry Pi.
You speak like a brilliant calm friend who knows everything about money. Never preachy. Never say "consult a financial advisor." Say things like "here's what I'd do" and "the good news is." Always end with one clear action. Keep responses concise — this is a chat not an essay.`;

async function buildSystemPrompt(memberId: string | null | undefined) {
  if (!memberId) {
    return SYSTEM_PROMPT_BASE;
  }

  try {
    const [cards, goals, shieldRules, transactions] = await Promise.all([
      piAPI.getCards(memberId),
      piAPI.getGoals(memberId),
      piAPI.getShieldRules(memberId),
      piAPI.getTransactions(memberId),
    ]);

    const recentTransactions = (transactions || [])
      .slice(0, 20)
      .map((t: any) => `${t.timestamp} | ${t.merchant} | €${t.amount} | ${t.status} | ${t.category}`)
      .join('\n');

    const goalsSummary = (goals || [])
      .map((g: any) => `${g.name}: €${g.current}/€${g.target} (${Math.round((g.current / g.target) * 100)}%)`)
      .join(', ');

    const cardsSummary = (cards || [])
      .map((c: any) => `${c.label}: €${c.balance}`)
      .join(', ');

    return `${SYSTEM_PROMPT_BASE}

== USER'S REAL FINANCIAL DATA ==

CARDS & BALANCES:
${cardsSummary}

GOALS:
${goalsSummary}

RECENT TRANSACTIONS (last 20):
${recentTransactions}

SHIELD: ${shieldRules?.length ?? 0} active rules

== IMPORTANT ==
You have full access to this user's real financial data above. Reference it naturally in your responses. When they ask about transactions, spending patterns, or goals — use the real numbers. Never say you don't have access to their data.`;
  } catch (err) {
    console.error('Failed to build system prompt with Pi data', err);
    return SYSTEM_PROMPT_BASE;
  }
}

export function GuideDashboard({ currentMemberId, onNavigate }: GuideDashboardProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [provider, setProvider] = useState<string>('anthropic');

  useEffect(() => {
    const config = loadNataAIConfig();
    setProvider(config.provider || 'anthropic');
    setHasKey(Boolean(config.apiKey) || config.provider === 'ollama');
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    setError('');
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: input }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const systemPrompt = await buildSystemPrompt(currentMemberId);
      const reply = await askNataGuide(nextMessages, systemPrompt);
      setMessages(prev => [...prev, { role: 'guide', content: reply }]);
    } catch (err) {
      setError('Sorry, NataGuide had trouble responding. Check your AI settings.');
      console.error(err);
      setMessages(prev => [...prev, {
        role: 'guide',
        content: "I'm having trouble connecting to your Pi right now. Make sure it's running and try again."
      }] );
    } finally {
      setLoading(false);
    }
  };

  const handleSendExistingConversation = async () => {
    if (!input.trim()) return;
    setError('');
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: input }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const systemPrompt = await buildSystemPrompt(currentMemberId);
      const reply = await askNataGuide(nextMessages, systemPrompt);
      setMessages(prev => [...prev, { role: 'guide', content: reply }]);
    } catch (err) {
      setError('Sorry, NataGuide had trouble responding. Check your AI settings.');
      console.error(err);
      setMessages(prev => [...prev, {
        role: 'guide',
        content: "I'm having trouble connecting to your Pi right now. Make sure it's running and try again."
      }] );
    } finally {
      setLoading(false);
    }
  };

  if (!hasKey) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white">NataGuide</h1>
          <p className="text-sm text-slate-400 mt-0.5">Your financial buddy. Ask anything.</p>
        </div>

        <GlassCard className="p-6 max-w-2xl">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-slate-900/90 p-3">
              <Shield size={20} className="text-slate-300" />
            </div>
            <div>
              <div className="text-sm text-slate-100 font-semibold">NataGuide needs an AI key to wake up.</div>
              <p className="mt-3 text-sm text-slate-400 leading-6">
                Go to Settings → AI Configuration
                <br />Your key stays on your device. We never see it.
              </p>
              <div className="mt-4">
                <Button variant="secondary" size="md" onClick={() => onNavigate?.('account')}>
                  <Settings size={16} /> Go to Settings
                </Button>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">NataGuide</h1>
          <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs text-slate-300">AI chat</span>
        </div>
        <p className="text-sm text-slate-400 mt-0.5">Your financial buddy. Ask anything.</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      <GlassCard className="p-4 space-y-4 max-h-[480px] overflow-y-auto" gradient>
        {messages.length === 0 && (
          <div className="text-sm text-slate-400">Start the conversation by asking a quick money question.</div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-xl ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {msg.role === 'guide' && (
                <div className="w-9 h-9 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center justify-center shrink-0 mt-1">
                  <Shield size={16} className="text-slate-300" />
                </div>
              )}
              <div
                className={`rounded-3xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600/90 text-white rounded-br-none'
                    : 'bg-slate-900/80 border border-slate-700 text-slate-100 rounded-bl-none'
                }`}
              >
                {msg.content}
              </div>
            </div>
          </div>
        ))}
      </GlassCard>

      <div className="flex flex-col gap-3">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && !loading && handleSendExistingConversation()}
          placeholder="What's on your mind?"
          className="w-full glass-input rounded-full px-4 py-3 text-sm text-white placeholder-slate-500 outline-none bg-slate-900/50 border border-slate-700 focus:border-slate-600 transition-colors"
          disabled={loading}
        />
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">NataGuide speaks like a calm, helpful friend. Keep it concise.</div>
          <Button variant="primary" size="md" onClick={handleSendExistingConversation} disabled={!input.trim() || loading}>
            {loading ? 'Thinking...' : 'Send'} <Send size={16} />
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4 text-sm text-slate-400">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <ArrowRight size={14} /> Quick tip
        </div>
        Ask about budgeting, saving, investing, crypto, or paychecks. NataGuide will suggest one clear action.
      </div>
    </div>
  );
}
