import { useState, useEffect } from 'react';
import { Shield, Trophy, Target, User, Search, Command, Brain, CheckCircle } from 'lucide-react';
import { GuideDashboard } from './components/guide/GuideDashboard';
import { ShieldDashboard } from './components/shield/ShieldDashboard';
import { PracticeDashboard } from './components/practice/PracticeDashboard';
import { GoalsDashboard } from './components/goals/GoalsDashboard';
import { AccountDashboard } from './components/account/AccountDashboard';
import { CommandBar } from './components/shared/CommandBar';
import type { Pillar } from './stores/appStore';
import { Modal } from './components/ui/Modal';
import { Button } from './components/ui/Button';
import { usePersistentState } from './lib/storage';
import { dispatchAppAction } from './lib/actions';

const pillars: { key: Pillar; label: string; icon: React.ReactNode; gradient: string; color: string }[] = [
  { key: 'shield', label: 'Shield', icon: <Shield size={20} />, gradient: 'from-blue-500 to-blue-600', color: '#3b82f6' },
  { key: 'practice', label: 'Practice', icon: <Trophy size={20} />, gradient: 'from-amber-500 to-amber-600', color: '#eab308' },
  { key: 'guide', label: 'Guide', icon: <Brain size={20} />, gradient: 'from-violet-500 to-violet-600', color: '#8b5cf6' },
  { key: 'goals', label: 'Goals', icon: <Target size={20} />, gradient: 'from-pink-500 to-pink-600', color: '#ec4899' },
];

function App() {
  const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;
  const [activePillar, setActivePillar] = useState<Pillar>('shield');
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = usePersistentState('onboarding-complete', false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandBarOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (pillar: Pillar) => {
    setActivePillar(pillar);
  };

  const renderPillar = () => {
    switch (activePillar) {
      case 'shield': return <ShieldDashboard />;
      case 'practice': return <PracticeDashboard />;
      case 'guide': return <GuideDashboard />;
      case 'goals': return <GoalsDashboard />;
      case 'account': return <AccountDashboard />;
    }
  };

  const startDemo = () => {
    setActivePillar('shield');
    setOnboardingComplete(true);
    window.setTimeout(() => dispatchAppAction('shield_demo'), 0);
  };

  return (
    <div className="h-screen flex flex-col bg-nata-bg overflow-hidden bg-cover bg-center" style={{ backgroundImage: `url(${assetUrl('bck.png')})`, backgroundAttachment: 'fixed' }}>
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-black/40 z-0" />
      {/* Top Bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-950/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src={assetUrl('logo.png')} alt="nataCONNECT" className="w-10 h-10 rounded-lg" />
        </div>

        {/* Command Trigger */}
        <button
          onClick={() => setCommandBarOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-slate-600 hover:bg-slate-800/90 transition-all duration-300 text-sm text-slate-300 hover:text-white"
        >
          <Search size={14} />
          <span className="hidden sm:inline">Command</span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-950/90 text-[10px] text-slate-500">
            <Command size={8} />K
          </kbd>
        </button>

        {/* Account */}
        <button
          onClick={() => setActivePillar('account')}
          className={`flex items-center gap-2 p-2 rounded-xl transition-all ${activePillar === 'account' ? 'bg-slate-800/90 text-white border border-slate-700' : 'text-slate-300 hover:bg-slate-900/90 hover:text-white'}`}
        >
          <div className="w-7 h-7 rounded-lg bg-slate-900/90 border border-slate-700 flex items-center justify-center">
            <User size={14} className="text-slate-200" />
          </div>
        </button>
      </header>

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto px-6 py-6 relative z-10 transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} bg-black/30`}>
        <div className="max-w-6xl mx-auto">
          {renderPillar()}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="relative z-10 flex items-center justify-around px-4 py-3 border-t border-slate-700 bg-slate-950/95">
        {pillars.map(pillar => {
          const isActive = activePillar === pillar.key;
          return (
            <button
              key={pillar.key}
              onClick={() => setActivePillar(pillar.key)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 relative glass-interactive ${isActive ? 'text-white bg-slate-800/90 border border-slate-700' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/90'}`}
            >
              <div className={`relative transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>
                {pillar.icon}
              </div>
              <span className="relative text-[10px] font-medium">{pillar.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Command Bar */}
      <CommandBar
        isOpen={commandBarOpen}
        onClose={() => setCommandBarOpen(false)}
        onNavigate={handleNavigate}
      />

      <Modal isOpen={!onboardingComplete} onClose={() => setOnboardingComplete(true)} title="Welcome to nataCONNECT">
        <div className="space-y-4">
          <p className="text-sm text-slate-300">This prototype has one main story: explain a suspicious payment before money moves, show the evidence, and reveal what approving it would do to protected goals.</p>
          <div className="space-y-2">{['Analyze a fake bank payment', 'Inspect the triggered rules and risk evidence', 'Block it and preserve your goals'].map((step, index) => <div key={step} className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-700"><CheckCircle size={16} className="text-blue-300" /><span className="text-sm text-white">{index + 1}. {step}</span></div>)}</div>
          <Button variant="primary" className="w-full" onClick={startDemo}>Start the 60-second demo</Button>
          <button onClick={() => setOnboardingComplete(true)} className="w-full text-xs text-slate-500 hover:text-slate-300">Explore on my own</button>
        </div>
      </Modal>
    </div>
  );
}

export default App;
