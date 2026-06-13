import { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Shield, Send } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'guide';
  content: string;
}

export function GuideDashboard() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">NataGuide</h1>
        <p className="text-sm text-slate-400 mt-0.5">Your financial buddy. Ask anything.</p>
      </div>

      {/* Chat Area */}
      <GlassCard className="p-4 space-y-4 max-h-96 overflow-y-auto" gradient>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-sm ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {msg.role === 'guide' && (
                <div className="w-8 h-8 rounded-full bg-slate-800/90 border border-slate-700 flex items-center justify-center shrink-0 mt-1">
                  <Shield size={16} className="text-slate-300" />
                </div>
              )}
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600/80 text-white rounded-br-none'
                    : 'bg-slate-900/80 border border-slate-700 text-slate-100 rounded-bl-none'
                }`}
              >
                {msg.content}
              </div>
            </div>
          </div>
        ))}
      </GlassCard>

      {/* Input Area */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSend()}
          placeholder="What's on your mind?"
          className="flex-1 bg-slate-900/50 border border-slate-700 rounded-full px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-slate-600 transition-colors"
        />
        <Button
          variant="primary"
          size="md"
          onClick={handleSend}
          disabled={!input.trim()}
          className="rounded-full px-4"
        >
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}
