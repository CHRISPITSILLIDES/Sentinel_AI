import { useState, useEffect } from 'react';
import { User, Bell, Lock, CreditCard, LogOut, ChevronRight, Shield, Trophy, Target, Moon, Globe, HelpCircle, Mail, Phone, Key, Cpu, CheckCircle, AlertTriangle, ArrowRight, TrendingUp } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import type { Card, FamilyMember } from '../../stores/appStore';
import { piAPI } from '../../api/pi';
import { askNataGuide, loadNataAIConfig } from '../../api/ai';
import { marketAPI } from '../../api/market';
import { bankAPI } from '../../api/bank';
// Bank/Tink removed for now

type AiProvider = 'anthropic' | 'openai' | 'ollama' | 'custom';

const aiProviderLabels: Record<AiProvider, string> = {
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI',
  ollama: 'Ollama (Local)',
  custom: 'Custom',
};

const aiProviderDefaults: Record<AiProvider, { endpoint: string; model: string; suggestions: string[] }> = {
  anthropic: {
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-6',
    suggestions: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5'],
  },
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
    suggestions: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  },
  ollama: {
    endpoint: 'http://10.36.234.47:11434/api/chat',
    model: 'llama3',
    suggestions: ['llama3', 'mistral', 'phi3', 'gemma'],
  },
  custom: {
    endpoint: '',
    model: '',
    suggestions: [],
  },
} as const;

function SettingRow({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-900/90 transition-all cursor-pointer group"
    >
      <div className="p-2 rounded-lg bg-slate-950/90 text-slate-400 group-hover:text-white transition-colors">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-sm text-white">{label}</div>
      </div>
      {value && <span className="text-xs text-slate-400">{value}</span>}
      <ChevronRight size={14} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
    </div>
  );
}

interface AccountDashboardProps {
  currentMember?: FamilyMember | null;
  emergencyPasscode: string;
  onSetEmergencyPasscode: (pin: string) => void;
  emergencyLockActive: boolean;
}

export function AccountDashboard({ currentMember, emergencyPasscode, onSetEmergencyPasscode, emergencyLockActive }: AccountDashboardProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [pin, setPin] = useState(emergencyPasscode);
  const [message, setMessage] = useState('');

  const [aiProvider, setAiProvider] = useState<AiProvider>('anthropic');
  const [aiEndpoint, setAiEndpoint] = useState<string>(aiProviderDefaults.anthropic.endpoint);
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModel, setAiModel] = useState<string>(aiProviderDefaults.anthropic.model);
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'success' | 'error' | 'testing'>('idle');
  const [aiFeedback, setAiFeedback] = useState('');

  const [marketProvider, setMarketProvider] = useState<'finnhub' | 'custom'>('finnhub');
  const [marketEndpoint, setMarketEndpoint] = useState('https://finnhub.io/api/v1');
  const [marketApiKey, setMarketApiKey] = useState('');
  const [showMarketApiKey, setShowMarketApiKey] = useState(false);
  const [marketStatus, setMarketStatus] = useState<'idle' | 'success' | 'error' | 'testing'>('idle');
  const [marketFeedback, setMarketFeedback] = useState('');

  // bank/Tink state removed temporarily
  // Tink status
  const [tinkStatus, setTinkStatus] = useState<any>(null);
  const [tinkConnected, setTinkConnected] = useState(false);
  const [tinkLastSync, setTinkLastSync] = useState<string | null>(null);
  const [tinkTxCount, setTinkTxCount] = useState<number | null>(null);
  const [tinkMessage, setTinkMessage] = useState('');

  const totalBalance = cards.reduce((sum, card) => sum + card.balance, 0);

  useEffect(() => {
    if (!currentMember) {
      setCards([]);
      return;
    }

    const sanitizedName = currentMember.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const fallbackCard: Card = {
      id: `virtual_default-${currentMember.id}`,
      name: `${sanitizedName}S_VIRTUAL_DEFAULT`,
      cardType: 'credit',
      lastFour: '0000',
      brand: 'Visa',
      balance: 0.0,
      currency: 'EUR',
      color: '#3b82f6',
      isActive: true,
    };

    piAPI.getCards(currentMember.id)
      .then((data: Card[]) => {
        const cardsResult = Array.isArray(data) ? data : [];
        setCards(cardsResult.length > 0 ? cardsResult : [fallbackCard]);
      })
      .catch(() => {
        setCards([fallbackCard]);
      });
  }, [currentMember]);

  useEffect(() => {
    try {
      const config = loadNataAIConfig();
      const provider = config.provider && ['anthropic', 'openai', 'ollama', 'custom'].includes(config.provider)
        ? (config.provider as AiProvider)
        : 'anthropic';
      setAiProvider(provider);
      setAiEndpoint(config.endpoint || aiProviderDefaults[provider].endpoint);
      setAiModel(config.model || aiProviderDefaults[provider].model);
      setAiApiKey(config.apiKey || '');
    } catch {
      // ignore invalid config
    }

    try {
      const savedConfig = JSON.parse(window.localStorage.getItem('nataMarketConfig') || '{}');
      if (savedConfig.endpoint) {
        setMarketEndpoint(savedConfig.endpoint);
      }
      if (savedConfig.apiKey) {
        setMarketApiKey(savedConfig.apiKey);
      }
      setMarketProvider(savedConfig.endpoint === 'https://finnhub.io/api/v1' || !savedConfig.endpoint ? 'finnhub' : 'custom');
    } catch {
      // ignore invalid market config
    }

    // bank config temporarily disabled

    try {
      const openTab = window.localStorage.getItem('nataconnect_open_account_tab');
      if (openTab === 'settings') {
        setActiveAccountTab('settings');
        window.localStorage.removeItem('nataconnect_open_account_tab');
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const applyProviderDefaults = (provider: AiProvider) => {
    setAiProvider(provider);
    setAiEndpoint(aiProviderDefaults[provider].endpoint);
    setAiModel(aiProviderDefaults[provider].model);
  };

  const saveAIConfig = () => {
    const config = {
      provider: aiProvider,
      endpoint: aiEndpoint,
      apiKey: aiApiKey,
      model: aiModel,
    };
    window.localStorage.setItem('nataAIConfig', JSON.stringify(config));
    setAiStatus('success');
    setAiFeedback('AI configuration saved locally.');
  };

  const saveMarketConfig = () => {
    const config = {
      apiKey: marketApiKey,
      endpoint: marketEndpoint,
    };
    window.localStorage.setItem('nataMarketConfig', JSON.stringify(config));
    setMarketStatus('success');
    setMarketFeedback('Market configuration saved locally.');
  };

  // bank config temporarily disabled

  const testMarketConnection = async () => {
    setMarketStatus('testing');
    setMarketFeedback('Testing connection...');

    try {
      await marketAPI.getQuote('AAPL');
      setMarketStatus('success');
      setMarketFeedback('✅ Connected');
    } catch (error) {
      setMarketStatus('error');
      setMarketFeedback('❌ Failed');
    }
  };

  // bank status temporarily disabled

  // Tink status retrieval disabled

  // bank connect temporarily disabled

  // bank connect temporarily disabled

  // Tink connect temporarily disabled

  // Sync temporarily disabled

  // bank/tink focus check removed

  // periodic bank sync removed

  const testAIConnection = async () => {
    const config = {
      provider: aiProvider,
      endpoint: aiEndpoint,
      apiKey: aiApiKey,
      model: aiModel,
    };
    window.localStorage.setItem('nataAIConfig', JSON.stringify(config));
    setAiStatus('testing');
    setAiFeedback('Testing connection...');

    try {
      const start = Date.now();
      await askNataGuide(
        [{ role: 'user', content: 'Hello from test connection.' }],
        'You are NataGuide, a personal financial buddy inside NataConnect — a privacy-first finance app running on a Raspberry Pi. You speak like a brilliant calm friend who knows everything about money. Never preachy. Never say "consult a financial advisor." Say things like "here\'s what I\'d do" and "the good news is." Always end with one clear action. Keep responses concise — this is a chat not an essay.'
      );
      const duration = Date.now() - start;
      setAiStatus('success');
      setAiFeedback(`✅ Connected · ${aiModel || aiProviderDefaults[aiProvider].model} · ${duration}ms`);
    } catch (error) {
      setAiStatus('error');
      setAiFeedback('❌ Failed · Check your API key and endpoint.');
    }
  };

  const savePasscode = () => {
    if (!/^\d{6}$/.test(pin)) {
      setMessage('Enter a 6-digit PIN.');
      return;
    }
    onSetEmergencyPasscode(pin);
    setMessage('Emergency passcode saved.');
  };

  const [activeAccountTab, setActiveAccountTab] = useState<'overview' | 'settings'>('overview');

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Account</h1>
            <p className="text-sm text-slate-400 mt-0.5">Manage your profile and preferences</p>
          </div>
          <div className="inline-flex rounded-full border border-slate-700 bg-slate-950/70 p-1">
            <button
              type="button"
              onClick={() => setActiveAccountTab('overview')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${activeAccountTab === 'overview' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveAccountTab('settings')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${activeAccountTab === 'settings' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Account Settings
            </button>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-400">
          {activeAccountTab === 'overview'
            ? 'View your cards, balance, and account activity in one place.'
            : 'Set rules, manage AI keys, models, and local Pi settings here.'}
        </div>
      </div>

      {/* Profile Card */}
      <GlassCard className="p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-slate-900/90 border border-slate-700 flex items-center justify-center">
              <User size={28} className="text-slate-200" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{currentMember?.name ?? 'Family Member'}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <Mail size={10} /> {currentMember?.id ? `${currentMember.id}@pi.local` : 'not available'}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                <Phone size={10} /> {currentMember ? 'Pi network profile' : 'No active member'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Total Balance</div>
            <div className="text-xl font-bold text-white">€{totalBalance.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      </GlassCard>

      {activeAccountTab === 'overview' && (
        <>
          {/* Cards Summary */}
          <div>
            <h2 className="text-sm font-medium text-slate-400 mb-3">Your Cards</h2>
            <div className="space-y-2">
              {cards.map(card => {
                const gradientMap: Record<string, string> = {
                  '#3b82f6': 'card-gradient-blue',
                  '#10b981': 'card-gradient-emerald',
                  '#fb923c': 'card-gradient-amber',
                  '#a855f7': 'card-gradient-violet',
                  '#f472b6': 'card-gradient-pink',
                  '#22d3ee': 'card-gradient-cyan',
                };
                const gradientClass = gradientMap[card.color] || 'card-gradient-blue';
                return (
                  <div key={card.id} className={`flex items-center gap-4 p-4 rounded-xl ${gradientClass} backdrop-blur-sm hover:shadow-lg transition-all`}>
                    <div className="p-2 rounded-lg" style={{ background: `${card.color}30`, color: card.color }}>
                      <CreditCard size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{card.name}</div>
                      <div className="text-xs text-slate-300">{card.brand} •••• {card.lastFour}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-white">€{card.balance.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
                      <Badge variant={card.isActive ? 'success' : 'neutral'}>{card.isActive ? 'Active' : 'Inactive'}</Badge>
                    </div>
                  </div>
                );
              })}
              {cards.length === 0 && (
                <div className="rounded-xl border border-slate-700 bg-slate-950/80 p-4 text-slate-400 text-sm">
                  Keine Karten gefunden. Dieses Konto ruft jetzt Daten direkt vom Raspberry Pi ab.
                </div>
              )}
            </div>
          </div>

          {/* Pillar Summary */}
          <div className="grid grid-cols-2 gap-3">
            <GlassCard className="p-4" hover gradient>
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className="text-blue-300" />
                <span className="text-xs text-slate-300">Shield</span>
              </div>
              <div className="text-lg font-bold text-white">4 Rules</div>
              <div className="text-xs text-slate-400">Live protection status</div>
            </GlassCard>
            <GlassCard className="p-4" hover gradient>
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={16} className="text-amber-300" />
                <span className="text-xs text-slate-300">Practice</span>
              </div>
              <div className="text-lg font-bold text-white">Score: 72</div>
              <div className="text-xs text-slate-400">4 achievements</div>
            </GlassCard>
            <GlassCard className="p-4" hover gradient>
              <div className="flex items-center gap-2 mb-2">
                <Target size={16} className="text-emerald-300" />
                <span className="text-xs text-slate-300">Goals</span>
              </div>
              <div className="text-lg font-bold text-white">4 Goals</div>
              <div className="text-xs text-slate-400">€8,927 total saved</div>
            </GlassCard>
          </div>
        </>
      )}

      {activeAccountTab === 'settings' && (
        <>
          {/* Settings */}
          <div>
            <h2 className="text-sm font-medium text-slate-400 mb-3">Account Settings</h2>
            <GlassCard className="p-2">
              <SettingRow icon={<Bell size={16} />} label="Notifications" value="All on" />
              <SettingRow icon={<Lock size={16} />} label="Privacy & Security" value="2FA on" />
              <SettingRow icon={<Moon size={16} />} label="Appearance" value="Dark" />
              <SettingRow icon={<Globe size={16} />} label="Language" value="English" />
              <SettingRow icon={<CreditCard size={16} />} label="Payment Methods" value="1 card" />
              <SettingRow icon={<HelpCircle size={16} />} label="Help & Support" />
            </GlassCard>
          </div>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-full bg-slate-900/80 p-3">
                <Cpu size={18} className="text-slate-300" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">AI Configuration</h2>
                <p className="text-xs text-slate-400">Your AI, your rules. Use your own API key and model.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-300">
                  Provider
                  <select
                    value={aiProvider}
                    onChange={e => applyProviderDefaults(e.target.value as any)}
                    className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white bg-transparent outline-none"
                  >
                    {Object.entries(aiProviderLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-slate-300">
                  Model
                  <input
                    type="text"
                    value={aiModel}
                    onChange={e => setAiModel(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none"
                    placeholder="Model name"
                  />
                </label>
              </div>

              <label className="space-y-2 text-sm text-slate-300">
                API Endpoint
                <input
                  type="text"
                  value={aiEndpoint}
                  onChange={e => setAiEndpoint(e.target.value)}
                  className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none"
                  placeholder="API endpoint"
                />
              </label>

              <label className="space-y-2 text-sm text-slate-300 relative">
                API Key
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={aiApiKey}
                    onChange={e => setAiApiKey(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-3 pr-28 text-sm text-white placeholder-slate-500 outline-none"
                    placeholder="Enter API key"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(prev => !prev)}
                    className="absolute inset-y-0 right-3 z-10 rounded-full px-3 text-slate-300 hover:text-white"
                  >
                    {showApiKey ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(aiProviderDefaults[aiProvider].suggestions || []).map(suggestion => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setAiModel(suggestion)}
                      className={`rounded-full border px-3 py-2 text-sm ${aiModel === suggestion ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-950/80 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'}`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                {aiProvider === 'ollama' && (
                  <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4 text-sm text-slate-300">
                    <div className="mb-2 font-semibold text-white">Pi instructions for Ollama</div>
                    <pre className="whitespace-pre-wrap break-words text-xs text-slate-300 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
{`Run AI locally on your Pi — no API key needed
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3
Endpoint: http://10.36.234.47:11434/api/chat`}
                    </pre>
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="secondary" size="md" onClick={testAIConnection}>
                  <CheckCircle size={16} /> Test Connection
                </Button>
                <Button variant="primary" size="md" onClick={saveAIConfig}>
                  <ArrowRight size={16} /> Save
                </Button>
              </div>

              {aiFeedback && (
                <div className={`rounded-2xl border p-3 text-sm ${aiStatus === 'success' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200' : aiStatus === 'error' ? 'border-rose-500 bg-rose-500/10 text-rose-200' : 'border-slate-700 bg-slate-900/70 text-slate-300'}`}>
                  {aiFeedback}
                </div>
              )}
              <div className="text-xs text-slate-500">
                Your API key stays on your device only. We never send it to the cloud.
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-full bg-slate-900/80 p-3">
                <TrendingUp size={18} className="text-slate-300" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Market Data Configuration</h2>
                <p className="text-xs text-slate-400">Configure Finnhub or a custom market data endpoint.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-300">
                  Provider
                  <select
                    value={marketProvider}
                    onChange={e => {
                      const provider = e.target.value as 'finnhub' | 'custom';
                      setMarketProvider(provider);
                      if (provider === 'finnhub') {
                        setMarketEndpoint('https://finnhub.io/api/v1');
                      }
                    }}
                    className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white bg-transparent outline-none"
                  >
                    <option value="finnhub">Finnhub</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm text-slate-300">
                  API Endpoint
                  <input
                    type="text"
                    value={marketEndpoint}
                    onChange={e => setMarketEndpoint(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none"
                    placeholder="https://finnhub.io/api/v1"
                  />
                </label>
              </div>

              <label className="space-y-2 text-sm text-slate-300 relative">
                API Key
                <div className="relative">
                  <input
                    type={showMarketApiKey ? 'text' : 'password'}
                    value={marketApiKey}
                    onChange={e => setMarketApiKey(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-3 pr-28 text-sm text-white placeholder-slate-500 outline-none"
                    placeholder="Enter API key"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMarketApiKey(prev => !prev)}
                    className="absolute inset-y-0 right-3 z-10 rounded-full px-3 text-slate-300 hover:text-white"
                  >
                    {showMarketApiKey ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="secondary" size="md" onClick={testMarketConnection}>
                  <CheckCircle size={16} /> Test Connection
                </Button>
                <Button variant="primary" size="md" onClick={saveMarketConfig}>
                  <ArrowRight size={16} /> Save
                </Button>
              </div>

              {marketFeedback && (
                <div className={`rounded-2xl border p-3 text-sm ${marketStatus === 'success' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200' : marketStatus === 'error' ? 'border-rose-500 bg-rose-500/10 text-rose-200' : 'border-slate-700 bg-slate-900/70 text-slate-300'}`}>
                  {marketFeedback}
                </div>
              )}
              <div className="text-xs text-slate-500">
                Your API key stays on your device only.
              </div>
            </div>
          </GlassCard>

          {/* Bank feature removed temporarily */}

          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-full bg-slate-900/80 p-3">
                <Key size={18} className="text-slate-300" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Emergency Passcode</h2>
                <p className="text-xs text-slate-400">Set a 6-digit PIN to lock and unlock mobile access.</p>
              </div>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none"
                placeholder="Enter 6-digit PIN"
              />
              <div className="flex gap-3 justify-end">
                <Button variant="secondary" size="md" onClick={savePasscode}>Save PIN</Button>
              </div>
              {message && <div className="text-sm text-slate-300">{message}</div>}
              <div className="text-xs text-slate-400">
                This PIN is stored locally on your Pi only. It is required to activate or deactivate the emergency phone lock.
              </div>
            </div>
          </GlassCard>

          {/* Danger Zone */}
          <div className="pt-2">
            <Button variant="danger" size="md" className="w-full">
              <LogOut size={16} /> Sign Out
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
