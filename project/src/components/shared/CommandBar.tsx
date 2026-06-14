import { useState, useRef, useEffect } from 'react';
import { Search, Shield, TrendingUp, Trophy, Target, ArrowRight, X } from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  pillar: 'shield' | 'practice' | 'goals';
  action: string;
}

const commands: CommandItem[] = [
  { id: '1', label: 'Protect my card', pillar: 'shield', action: 'shield_add_rule' },
  { id: '2', label: 'Block unverified sellers', pillar: 'shield', action: 'shield_block_unverified' },
  { id: '3', label: 'Set spending limit', pillar: 'shield', action: 'shield_spending_limit' },
  { id: '4', label: 'Report a scam', pillar: 'shield', action: 'shield_report_scam' },
  { id: '8', label: 'Practice investing', pillar: 'practice', action: 'practice_start' },
  { id: '9', label: 'Open simulated trade', pillar: 'practice', action: 'practice_trade' },
  { id: '10', label: 'View my skill score', pillar: 'practice', action: 'practice_score' },
  { id: '11', label: 'Set a savings goal', pillar: 'goals', action: 'goals_new' },
  { id: '12', label: 'Protect my rent buffer', pillar: 'goals', action: 'goals_rent' },
  { id: '13', label: 'Set spending limit for entertainment', pillar: 'goals', action: 'goals_limit_entertainment' },
  { id: '14', label: 'Track my vacation savings', pillar: 'goals', action: 'goals_vacation' },
];

const pillarConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  shield: { icon: <Shield size={14} />, color: 'text-slate-200' },
  practice: { icon: <Trophy size={14} />, color: 'text-slate-200' },
  goals: { icon: <Target size={14} />, color: 'text-slate-200' },
};

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (pillar: 'shield' | 'practice' | 'goals') => void;
}

export function CommandBar({ isOpen, onClose, onNavigate }: CommandBarProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = commands.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeCommand = (cmd: CommandItem) => {
    onNavigate(cmd.pillar);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      executeCommand(filtered[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div className="relative max-w-lg mx-auto mt-[15vh] px-4" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-950/90 border border-slate-700 rounded-2xl overflow-hidden animate-scale-in">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700">
            <Search size={18} className="text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What would you like to do?"
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
            />
            <button onClick={onClose} className="p-1 rounded hover:bg-slate-900/80 transition-colors text-slate-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-500">No commands found</div>
            ) : (
              filtered.map((cmd, i) => {
                const config = pillarConfig[cmd.pillar];
                return (
                  <button
                    key={cmd.id}
                    onClick={() => executeCommand(cmd)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-all ${i === selectedIndex ? 'bg-slate-800/90' : 'hover:bg-slate-950/90'}`}
                  >
                    <div className="p-1.5 rounded-lg bg-slate-900/80 text-slate-200">
                      {config.icon}
                    </div>
                    <span className="flex-1 text-sm text-white">{cmd.label}</span>
                    <ArrowRight size={14} className={`${i === selectedIndex ? 'text-slate-300' : 'text-slate-500'} transition-colors`} />
                  </button>
                );
              })
            )}
          </div>
          <div className="px-5 py-3 border-t border-slate-700 flex items-center gap-4 text-xs text-slate-500">
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-950/90 text-slate-400">↑↓</kbd> navigate</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-950/90 text-slate-400">↵</kbd> select</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-950/90 text-slate-400">esc</kbd> close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
