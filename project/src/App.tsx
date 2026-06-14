import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Shield, TrendingUp, Trophy, Target, User, Search, Command, Sparkles, Brain, ChevronDown, Lock } from 'lucide-react';
import { GuideDashboard } from './components/guide/GuideDashboard';
import { ShieldDashboard } from './components/shield/ShieldDashboard';
import { PracticeDashboard } from './components/practice/PracticeDashboard';
import { GoalsDashboard } from './components/goals/GoalsDashboard';
import { AccountDashboard } from './components/account/AccountDashboard';
import { FamilyVault } from './components/account/FamilyVault';
import { FamilyOverview } from './components/account/FamilyOverview';
// Command bar removed
import { mockFamilyMembers, mockFamilyGoals, mockFamilyActivity, mockFamilyShieldRules } from './stores/appStore';
import type { Pillar, FamilyMember, FamilyGoal, FamilyActivity, ShieldRule } from './stores/appStore';
import { piAPI } from './api/pi';
// Tink integration temporarily disabled

const pillars: { key: Pillar; label: string; icon: React.ReactNode; gradient: string; color: string }[] = [
  { key: 'shield', label: 'Shield', icon: <Shield size={20} />, gradient: 'from-blue-500 to-blue-600', color: '#3b82f6' },
  { key: 'practice', label: 'Practice', icon: <Trophy size={20} />, gradient: 'from-amber-500 to-amber-600', color: '#eab308' },
  { key: 'guide', label: 'Guide', icon: <Brain size={20} />, gradient: 'from-violet-500 to-violet-600', color: '#8b5cf6' },
  { key: 'goals', label: 'Goals', icon: <Target size={20} />, gradient: 'from-pink-500 to-pink-600', color: '#ec4899' },
];

function App() {
  const [activePillar, setActivePillar] = useState<Pillar>('shield');
  // command bar removed
  const [isLoaded, setIsLoaded] = useState(false);
  const [emergencyPasscode, setEmergencyPasscode] = useState('');
  const [emergencyLockActive, setEmergencyLockActive] = useState(false);
  const [emergencyLockTarget, setEmergencyLockTarget] = useState('This device');
  const [emergencyLog, setEmergencyLog] = useState('');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(mockFamilyMembers);
  const [familyGoals, setFamilyGoals] = useState<FamilyGoal[]>(mockFamilyGoals);
  const [familyActivity, setFamilyActivity] = useState<FamilyActivity[]>(mockFamilyActivity);
  const [familyShieldRules] = useState<ShieldRule[]>(mockFamilyShieldRules);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [lockedMemberId, setLockedMemberId] = useState<string | null>(null);
  const [piMembersLoaded, setPiMembersLoaded] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [showFamilyOverview, setShowFamilyOverview] = useState(false);
  const [piOnline, setPiOnline] = useState<boolean | null>(null);
  const accountButtonRef = useRef<HTMLButtonElement | null>(null);
  const [accountMenuRect, setAccountMenuRect] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    // Tink redirect handling disabled while bank feature is removed
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const storedPasscode = window.localStorage.getItem('nataconnect_emergency_passcode');
    const storedLock = window.localStorage.getItem('nataconnect_emergency_lock');
    const storedTarget = window.localStorage.getItem('nataconnect_emergency_lock_target');
    const storedLog = window.localStorage.getItem('nataconnect_emergency_log');
    if (storedPasscode) setEmergencyPasscode(storedPasscode);
    if (storedLock === 'true') setEmergencyLockActive(true);
    if (storedTarget) setEmergencyLockTarget(storedTarget);
    if (storedLog) setEmergencyLog(storedLog);
  }, []);

  useEffect(() => {
    let mounted = true;
    piAPI.getMembers()
      .then((data: any[]) => {
        if (!mounted) return;
        if (!Array.isArray(data) || data.length === 0) {
          setFamilyMembers(mockFamilyMembers);
          return;
        }
        const mapped = data.map(item => ({
          id: String(item.id),
          name: item.name || `Member ${item.id}`,
          role: item.role || 'member',
          pin: item.pin || '',
          lastLogin: item.last_login ? new Date(item.last_login).toLocaleString('de-DE') : item.lastLogin || 'Unknown',
          phoneLocked: item.phone_locked ?? false,
          healthScore: item.health_score ?? 80,
          netWorth: item.net_worth ?? 0,
          avatar: item.name ? String(item.name).charAt(0).toUpperCase() : '?',
          color: item.color || '#64748b',
          badge: item.role ? String(item.role).charAt(0).toUpperCase() + String(item.role).slice(1) : 'Member',
        }));
        setFamilyMembers(mapped);
      })
      .catch(() => {
        if (mounted) setFamilyMembers(mockFamilyMembers);
      })
      .finally(() => {
        if (mounted) setPiMembersLoaded(true);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    window.localStorage.setItem('nataconnect_emergency_passcode', emergencyPasscode);
  }, [emergencyPasscode]);

  useEffect(() => {
    window.localStorage.setItem('nataconnect_emergency_lock', String(emergencyLockActive));
  }, [emergencyLockActive]);

  useEffect(() => {
    window.localStorage.setItem('nataconnect_emergency_lock_target', emergencyLockTarget);
  }, [emergencyLockTarget]);

  useEffect(() => {
    window.localStorage.setItem('nataconnect_emergency_log', emergencyLog);
  }, [emergencyLog]);

  useEffect(() => {
    const storedMemberId = window.localStorage.getItem('nataconnect_current_member');
    const storedLocked = window.localStorage.getItem('nataconnect_locked_member');
    if (storedMemberId) setCurrentMemberId(storedMemberId);
    if (storedLocked) setLockedMemberId(storedLocked);
  }, []);

  useEffect(() => {
    if (currentMemberId) {
      window.localStorage.setItem('nataconnect_current_member', currentMemberId);
    } else {
      window.localStorage.removeItem('nataconnect_current_member');
    }
  }, [currentMemberId]);

  useEffect(() => {
    if (lockedMemberId) {
      window.localStorage.setItem('nataconnect_locked_member', lockedMemberId);
    } else {
      window.localStorage.removeItem('nataconnect_locked_member');
    }
  }, [lockedMemberId]);

  // Command shortcut removed

  useEffect(() => {
    let mounted = true;
    const check = () => {
      piAPI.getStatus()
        .then(() => { if (mounted) setPiOnline(true); })
        .catch(() => { if (mounted) setPiOnline(false); });
    };
    check();
    const id = setInterval(check, 30000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const currentMember = familyMembers.find(member => member.id === currentMemberId) ?? null;

  const handleNavigate = (pillar: Pillar) => {
    setActivePillar(pillar);
  };

  const handleEnterMember = (memberId: string) => {
    setCurrentMemberId(memberId);
    setLockedMemberId(null);
    setActivePillar('shield');
    setAccountMenuOpen(false);
    setShowFamilyOverview(false);
  };

  const handleUnlockMember = async (memberId: string, pin: string) => {
    try {
      const result = await piAPI.verifyPin(memberId, pin);
      const success = result?.success || result === true;
      if (success) {
        handleEnterMember(memberId);
        return true;
      }
    } catch (error) {
      console.error('Failed to verify PIN with Pi:', error);
    }

    return false;
  };

  const handleSwitchAccount = () => {
    setCurrentMemberId(null);
    setLockedMemberId(null);
    setAccountMenuOpen(false);
  };

  const handleLockAccount = () => {
    if (currentMemberId) {
      setLockedMemberId(currentMemberId);
      setCurrentMemberId(null);
      setAccountMenuOpen(false);
    }
  };

  const handleAddFamilyMember = (member: FamilyMember) => {
    setFamilyMembers(prev => [...prev, member]);
  };

  useLayoutEffect(() => {
    if (!accountMenuOpen || !accountButtonRef.current) {
      setAccountMenuRect(null);
      return;
    }
    const rect = accountButtonRef.current.getBoundingClientRect();
    setAccountMenuRect({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
  }, [accountMenuOpen]);

  const renderPillar = () => {
    if (!currentMemberId) {
      return (
        <FamilyVault
          members={familyMembers}
          selectedLockedMemberId={lockedMemberId}
          onEnterMember={handleEnterMember}
          onUnlockMember={handleUnlockMember}
          onAddMember={handleAddFamilyMember}
        />
      );
    }

    if (showFamilyOverview) {
      return (
        <FamilyOverview
          members={familyMembers}
          familyGoals={familyGoals}
          activities={familyActivity}
          onClose={() => setShowFamilyOverview(false)}
        />
      );
    }

    switch (activePillar) {
      case 'shield': return (
        <ShieldDashboard
          currentMember={currentMember}
          familyShieldRules={familyShieldRules}
          emergencyLockActive={emergencyLockActive}
          emergencyPasscode={emergencyPasscode}
          emergencyLockTarget={emergencyLockTarget}
          emergencyLog={emergencyLog}
          onSetEmergencyLockActive={setEmergencyLockActive}
          onSetEmergencyLockTarget={setEmergencyLockTarget}
          onLogEvent={setEmergencyLog}
        />
      );
      case 'practice': return <PracticeDashboard />;
      case 'guide': return <GuideDashboard currentMemberId={currentMemberId} onNavigate={pillar => setActivePillar(pillar)} />;
      case 'goals': return <GoalsDashboard currentMember={currentMember} />;
      case 'account': return (
        <AccountDashboard
          currentMember={currentMember}
          emergencyPasscode={emergencyPasscode}
          onSetEmergencyPasscode={setEmergencyPasscode}
          emergencyLockActive={emergencyLockActive}
        />
      );
      default:
        return <GuideDashboard currentMemberId={currentMemberId} />;
    }
  };

  const activePillarConfig = pillars.find(p => p.key === activePillar);

  return (
    <div className="h-screen flex flex-col bg-nata-bg overflow-hidden bg-cover bg-center" style={{ backgroundImage: 'url(/bck.png)', backgroundAttachment: 'fixed' }}>
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-black/40 z-0" />
      {/* Top Bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-950/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-lg" />
        </div>

        {/* Command trigger removed */}

        <div className="hidden sm:flex items-center gap-2 ml-4 text-sm">
          <div className={`px-2 py-1 rounded-md border ${piOnline === true ? 'border-emerald-600 text-emerald-300 bg-emerald-900/10' : piOnline === false ? 'border-rose-600 text-rose-300 bg-rose-900/10' : 'border-slate-700 text-slate-400'}`}>
            {piOnline === true ? 'Pi Online' : piOnline === false ? 'Pi Offline' : 'Checking Pi...'}
          </div>
        </div>

        {/* Account */}
        {currentMember ? (
          <div className="relative">
            <button
              ref={accountButtonRef}
              onClick={() => setAccountMenuOpen(prev => !prev)}
              className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 hover:bg-slate-800/90 hover:text-white transition-all"
            >
              <div className="w-7 h-7 rounded-full bg-slate-800/90 border border-slate-700 flex items-center justify-center text-xs font-semibold text-white">
                {currentMember.avatar}
              </div>
              <span className="hidden sm:inline text-sm">{currentMember.name}</span>
              <ChevronDown size={14} />
            </button>
            {accountMenuOpen && accountMenuRect && createPortal(
              <div
                style={{ position: 'fixed', top: accountMenuRect.top, right: accountMenuRect.right, width: 256 }}
                className="rounded-2xl border border-slate-700 bg-slate-950/95 shadow-xl shadow-black/40 backdrop-blur-xl py-2 z-50"
              >
                <div className="px-4 py-3 border-b border-slate-800">
                  <div className="text-xs text-slate-400">Current user</div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900/90 text-white font-semibold">{currentMember.avatar}</div>
                    <div>
                      <div className="text-sm font-semibold text-white">{currentMember.name}</div>
                      <div className="text-xs text-slate-500">{currentMember.badge}</div>
                    </div>
                  </div>
                </div>
                <div className="p-2 space-y-1">
                  {familyMembers.map(member => (
                    <button
                      key={member.id}
                      onClick={() => { handleEnterMember(member.id); setAccountMenuOpen(false); }}
                      className={`w-full text-left rounded-xl px-3 py-2 text-sm transition-all ${member.id === currentMemberId ? 'bg-slate-900/90 text-white' : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'}`}
                    >
                      {member.name} <span className="text-xs text-slate-500">{member.badge}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => { window.localStorage.setItem('nataconnect_open_account_tab', 'settings'); setActivePillar('account'); setAccountMenuOpen(false); }}
                    className="w-full text-left rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-slate-900/80 hover:text-white"
                  >Account Settings</button>
                  <button
                    onClick={handleSwitchAccount}
                    className="w-full text-left rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-slate-900/80 hover:text-white"
                  >Switch Account</button>
                  <button
                    onClick={handleLockAccount}
                    className="w-full text-left rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-slate-900/80 hover:text-white"
                  >Lock This Account</button>
                  {currentMember.role === 'admin' && (
                    <button
                      onClick={() => { setShowFamilyOverview(true); setAccountMenuOpen(false); }}
                      className="w-full text-left rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-slate-900/80 hover:text-white"
                    >Family Overview</button>
                  )}
                </div>
              </div>,
              document.body
            )}
          </div>
        ) : (
          <button
            onClick={() => setActivePillar('account')}
            className={`flex items-center gap-2 p-2 rounded-xl transition-all ${activePillar === 'account' ? 'bg-slate-800/90 text-white border border-slate-700' : 'text-slate-300 hover:bg-slate-900/90 hover:text-white'}`}
          >
            <div className="w-7 h-7 rounded-lg bg-slate-900/90 border border-slate-700 flex items-center justify-center">
              <User size={14} className="text-slate-200" />
            </div>
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto px-6 py-6 relative z-10 transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} bg-black/30`}>
        <div className="max-w-6xl mx-auto">
          {currentMember && !showFamilyOverview && currentMemberId ? (
            <div className="mb-6 rounded-3xl border border-slate-700 bg-slate-950/90 p-4 text-slate-100 shadow-lg shadow-black/30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-sm text-slate-400 uppercase tracking-[0.2em]">Logged in as</div>
                  <div className="text-xl font-semibold text-white">{currentMember.name}</div>
                </div>
                
              </div>
            </div>
          ) : null}
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

      {/* Command bar removed */}
    </div>
  );
}

export default App;
