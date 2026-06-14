import { useState, useEffect } from 'react';
import { Shield, Users, AlertTriangle, CheckCircle, Plus, ChevronRight, Flag, Eye, Clock, Ban, DollarSign } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { GlassCard } from '../ui/GlassCard';
import { Modal } from '../ui/Modal';
import { mockShieldRules, mockTransactions, mockScamReports } from '../../stores/appStore';
import type { Card, FamilyMember, ShieldRule, Transaction, ScamReport } from '../../stores/appStore';
import { piAPI } from '../../api/pi';
import { reportScamToFirebase, subscribeToCommunityFeed, getCommunityStats, getCommunityReport } from '../../api/firebase';

interface ShieldDashboardProps {
  emergencyLockActive: boolean;
  emergencyPasscode: string;
  emergencyLog: string;
  emergencyLockTarget: string;
  onSetEmergencyLockActive: (active: boolean) => void;
  onSetEmergencyLockTarget: (target: string) => void;
  onLogEvent: (event: string) => void;
  currentMember?: FamilyMember | null;
  familyShieldRules: ShieldRule[];
}

function safeHostname(input?: string) {
  if (!input) return '';
  try {
    const url = input.startsWith('http') ? new URL(input) : new URL('https://' + input);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch (e) {
    return input.replace(/^www\./, '').toLowerCase();
  }
}

function computeSimpleSimilarity(a: string, b: string) {
  const sa = a.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const sb = b.replace(/[^a-z0-9]/gi, '').toLowerCase();
  if (!sa || !sb) return 0;
  const setA = new Set(sa.split(''));
  const common = Array.from(new Set(sb.split(''))).filter(ch => setA.has(ch)).length;
  const score = Math.round((common / Math.max(sa.length, sb.length)) * 100);
  return Math.min(100, Math.max(0, score));
}

function extractReportsFromReason(reason?: string) {
  if (!reason) return 0;
  const m = reason.match(/(\d+)\s+community\s+reports/i) || reason.match(/reported\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : 0;
}

function CardItem({ card, isSelected, onClick }: { card: Card; isSelected: boolean; onClick: () => void }) {
  const gradients: Record<string, string> = {
    '1': 'from-blue-600/40 to-cyan-600/40',
    '2': 'from-purple-600/40 to-pink-600/40',
    '3': 'from-emerald-600/40 to-teal-600/40',
  };
  
  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl p-4 cursor-pointer transition-all duration-300 overflow-hidden bg-gradient-to-br ${gradients[card.id] || 'from-slate-800/40 to-slate-700/40'} ${isSelected ? 'ring-2 ring-slate-600/80 scale-[1.02]' : 'hover:scale-[1.01]'}`}
      style={{ border: '1px solid rgba(148,163,184,0.18)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{card.brand}</span>
        <span className="text-xs text-slate-400">{card.cardType}</span>
      </div>
      <div className="text-lg font-mono tracking-widest text-white/80 mb-3">
        •••• •••• •••• {card.lastFour}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/90 font-medium">{card.name}</span>
        <span className="text-sm font-semibold text-white">{card.balance.toLocaleString('de-DE', { style: 'currency', currency: card.currency })}</span>
      </div>
    </div>
  );
}

function RuleItem({ rule, onToggle }: { rule: ShieldRule; onToggle: (id: string) => void }) {
  const typeIcons: Record<string, React.ReactNode> = {
    spending_limit: <DollarSign size={16} />,
    time_restriction: <Clock size={16} />,
    seller_verification: <Eye size={16} />,
    category_block: <Ban size={16} />,
    custom: <Shield size={16} />,
  };

  const icon = rule.scope === 'family' ? <Users size={16} /> : typeIcons[rule.ruleType];

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/90 border border-slate-700 hover:bg-slate-900/90 transition-all group">
      <div className="p-2 rounded-lg bg-slate-900/80 text-slate-300">
        {typeIcons[rule.ruleType]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 truncate">{rule.ruleText}</p>
      </div>
      <button
        onClick={() => onToggle(rule.id)}
        className={`w-9 h-5 rounded-full transition-all duration-200 ${rule.isActive ? 'bg-slate-700' : 'bg-slate-800/80'} relative`}
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-slate-300/90 transition-all duration-200 ${rule.isActive ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function TransactionItem({ tx }: { tx: Transaction }) {
  const statusConfig: Record<string, { icon: React.ReactNode; badge: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; label: string }> = {
    approved: { icon: <CheckCircle size={16} className="text-slate-300" />, badge: 'success', label: 'Approved' },
    blocked: { icon: <AlertTriangle size={16} className="text-slate-300" />, badge: 'warning', label: 'Reviewed' },
    pending: { icon: <Clock size={16} className="text-slate-300" />, badge: 'warning', label: 'Pending' },
    flagged: { icon: <AlertTriangle size={16} className="text-slate-300" />, badge: 'warning', label: 'Reviewed' },
  };

  const config = statusConfig[tx.status] || statusConfig.pending;

  // Scam fingerprint details
  const _report = mockScamReports.find(r => (
    r.sellerName === tx.sellerName || (r.sellerUrl && tx.sellerUrl && safeHostname(r.sellerUrl) === safeHostname(tx.sellerUrl))
  ));
  const _reportCount = _report ? _report.reportCount : (extractReportsFromReason(tx.blockReason) || (tx.isScamReport ? 1 : 0));
  const _firstSeenDays = _report && _report.createdAt ? Math.ceil((Date.now() - new Date(_report.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : undefined;
  const _a = safeHostname(tx.sellerUrl || tx.sellerName);
  const _b = safeHostname(_report?.sellerUrl || _report?.sellerName);
  const _matchPercent = _b ? computeSimpleSimilarity(_a, _b) : computeSimpleSimilarity(_a, tx.sellerName || '');

  return (
    <div className="p-4 rounded-xl border transition-all bg-slate-950/90 border-slate-700 hover:bg-slate-900/90">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white truncate">{tx.sellerName}</span>
            <Badge variant={config.badge}>{config.label}</Badge>
            {tx.isScamReport && (
              <Badge variant="danger"><Flag size={10} className="mr-1" />Scam</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>{tx.amount.toLocaleString('de-DE', { style: 'currency', currency: tx.currency })}</span>
            <span>{tx.category}</span>
            <span>{new Date(tx.createdAt).toLocaleString('de-DE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {tx.blockReason && (
            <p className="mt-2 text-xs text-slate-300 bg-slate-950/90 p-2 rounded-lg border border-slate-700">
              {tx.blockReason}
            </p>
          )}

          {(tx.status === 'blocked' || tx.status === 'flagged' || tx.isScamReport) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400">Review details:</span>
              <Badge variant={_matchPercent > 70 ? 'danger' : _matchPercent > 40 ? 'warning' : 'neutral'}>{_matchPercent}% match</Badge>
              <Badge variant={_reportCount > 10 ? 'danger' : _reportCount > 0 ? 'warning' : 'neutral'}>Reported {_reportCount}×</Badge>
              <Badge variant="info">{_firstSeenDays !== undefined ? `First seen: ${_firstSeenDays} days ago` : 'First seen: unknown'}</Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ScanResult {
  id: string;
  hostname: string;
  status: 'danger' | 'suspicious' | 'safe';
  title: string;
  reportCount: number;
  firstSeen: string;
  category: string;
  domainAge: string;
  matchPercent?: number;
  trustedNodes?: number;
  notes: string[];
}

export function ShieldDashboard({ currentMember, familyShieldRules, emergencyLockActive, emergencyPasscode, emergencyLockTarget, emergencyLog, onSetEmergencyLockActive, onSetEmergencyLockTarget, onLogEvent }: ShieldDashboardProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [rules, setRules] = useState<ShieldRule[]>(mockShieldRules);
  const [transactions, setTransactions] = useState(mockTransactions);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRuleText, setNewRuleText] = useState('');
  const [newRuleType, setNewRuleType] = useState<ShieldRule['ruleType']>('custom');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [emergencyPinInput, setEmergencyPinInput] = useState('');
  const [emergencyMessage, setEmergencyMessage] = useState('');
  const [selectedEmergencyPhone, setSelectedEmergencyPhone] = useState(emergencyLockTarget || "Sara's iPhone");
  const [scanOpen, setScanOpen] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scanMessage, setScanMessage] = useState('Ready to scan.');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [communityReports, setCommunityReports] = useState<ScamReport[]>([]);
  const [communityStats, setCommunityStats] = useState<{ totalReports: number; uniqueSellers: number; topCountry?: string } | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reportMessage, setReportMessage] = useState('');

  const phoneOptions = ["Sara's iPhone", "Zack's Samsung Galaxy", 'Work Tablet'];

  const scanSteps = ['Checking domain...', 'Cross-referencing community reports...', 'Analyzing patterns...', 'Done.'];

  const cardRules = rules.filter(r => r.cardId === selectedCard && r.scope !== 'family');
  const familyRulesList = rules.filter(r => r.scope === 'family');
  const flaggedCount = transactions.filter(t => t.status === 'blocked' || t.status === 'flagged' || t.isScamReport).length;
  const approvedCount = transactions.filter(t => t.status === 'approved').length;

  const getCountryCodeFromLocale = () => {
    if (typeof navigator === 'undefined') return 'GB';
    const locale = navigator.language || (navigator.languages && navigator.languages[0]) || 'en-GB';
    return (locale.split(/[-_]/)[1] || 'GB').toUpperCase();
  };

  const countryCode = (currentMember?.country || getCountryCodeFromLocale()).toUpperCase();
  const countryNames: Record<string, string> = {
    DE: 'Germany',
    FR: 'France',
    ES: 'Spain',
    US: 'United States',
    GB: 'United Kingdom',
  };
  const countryLabel = countryNames[countryCode] || countryCode;
  const countryFlaggedSellers = (communityReports.length > 0 ? communityReports : mockScamReports)
    .filter(report => (report.country || 'US').toUpperCase() === countryCode)
    .sort((a, b) => b.reportCount - a.reportCount)
    .slice(0, 10);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  const deriveScanResult = (input: string): ScanResult => {
    const hostname = safeHostname(input) || input.trim() || 'unknown-site.com';
    const lower = hostname.toLowerCase();
    const isDanger = /superdealz|fake|traveldealz|scam|counterfeit|fraud/.test(lower);
    const isSuspicious = /unknown|unverified|shop|net|xyz/.test(lower) && !isDanger;

    if (isDanger) {
      return {
        id: String(Date.now()),
        hostname,
        status: 'danger',
        title: 'SCAM DETECTED',
        reportCount: 89,
        firstSeen: '4 days ago',
        category: 'Fake online store',
        domainAge: '6 days old',
        matchPercent: 94,
        notes: ['DO NOT visit this link', 'DO NOT enter card details'],
      };
    }

    if (isSuspicious) {
      return {
        id: String(Date.now()),
        hostname,
        status: 'suspicious',
        title: 'PROCEED WITH CAUTION',
        reportCount: 3,
        firstSeen: '2 weeks ago',
        category: 'Unverified seller',
        domainAge: '23 days old',
        notes: ['Not enough reports to confirm scam', 'But exercise caution'],
      };
    }

    return {
      id: String(Date.now()),
      hostname,
      status: 'safe',
      title: 'LOOKS SAFE',
      reportCount: 0,
      firstSeen: 'Verified domain',
      category: 'Trusted site',
      domainAge: '26 years old',
      trustedNodes: 1247,
      notes: ['Always stay alert even on trusted sites'],
    };
  };

  useEffect(() => {
    if (!scanning) return;
    setScanStep(0);
    setScanMessage(scanSteps[0]);

    const intervalId = window.setInterval(() => {
      setScanStep(prev => Math.min(prev + 1, scanSteps.length - 1));
    }, 550);

    const timeoutId = window.setTimeout(() => {
      const result = deriveScanResult(scanInput);
      (async () => {
        try {
          const hostname = safeHostname(result.hostname);
          const community = await getCommunityReport(hostname);
          if (community) {
            result.reportCount = community.reportCount || result.reportCount;
            result.firstSeen = community.createdAt || result.firstSeen;
            if (community.description) result.notes = [...result.notes, community.description];
          }
        } catch (e) {
          // ignore firebase errors
        } finally {
          setScanResult(result);
          setRecentScans(prev => [result, ...prev].slice(0, 3));
          setScanning(false);
        }
      })();
    }, 2000);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [scanning]);

  useEffect(() => {
    if (scanning) {
      setScanMessage(scanSteps[scanStep]);
    }
  }, [scanStep, scanning]);

  const handleRunScan = () => {
    if (!scanInput.trim()) {
      setScanMessage('Paste a suspicious link first.');
      return;
    }
    setScanResult(null);
    setReportMessage('');
    setScanning(true);
  };

  const handleReportCommunity = async () => {
    if (!scanResult) return;
    const hostname = safeHostname(scanResult.hostname);
    if (!hostname) {
      setReportMessage('Unable to identify the report target.');
      return;
    }

    setReporting(true);
    setReportMessage('');

    try {
      const report = await reportScamToFirebase({
        hostname,
        sellerName: scanResult.hostname,
        sellerUrl: scanResult.hostname,
        reportType: scanResult.status === 'danger' ? 'scam' : 'suspicious',
        country: countryCode,
        description: `NataScan auto-report for ${scanResult.hostname}`,
      });

      if (report) {
        setReportMessage(`Report submitted. ${report.reportCount} community reports now.`);
        setCommunityReports(prev => {
          const existing = prev.find(r => r.id === report.id);
          if (existing) {
            return prev.map(r => r.id === report.id ? report : r);
          }
          return [report, ...prev];
        });
      } else {
        setReportMessage('Report submitted. Community data will refresh soon.');
      }
    } catch (error) {
      console.error(error);
      setReportMessage('Unable to submit report right now.');
    } finally {
      setReporting(false);
    }
  };

  const getStatusStyles = (result?: ScanResult) => {
    switch (result?.status) {
      case 'danger': return 'border-red-500/30 bg-red-500/5';
      case 'suspicious': return 'border-amber-500/30 bg-amber-500/5';
      case 'safe': return 'border-emerald-500/30 bg-emerald-500/5';
      default: return 'border-slate-700 bg-slate-950/90';
    }
  };

  useEffect(() => {
    if (!currentMember) {
      setCards([]);
      setSelectedCard('');
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
        if (cardsResult.length > 0) {
          setCards(cardsResult);
          setSelectedCard(cardsResult[0]?.id ?? '');
        } else {
          setCards([fallbackCard]);
          setSelectedCard(fallbackCard.id);
        }
      })
      .catch(() => {
        setCards([fallbackCard]);
        setSelectedCard(fallbackCard.id);
      });

    piAPI.getShieldRules(currentMember.id)
      .then((data: ShieldRule[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setRules(data);
        }
      })
      .catch(() => {
        // ignore and keep mock data
      });
  }, [currentMember]);

  useEffect(() => {
    const unsubscribe = subscribeToCommunityFeed(reports => setCommunityReports(reports), countryCode);
    getCommunityStats().then(setCommunityStats).catch(() => {
      // ignore firebase errors when not configured
    });
    return unsubscribe;
  }, [countryCode]);

  const addRule = () => {
    if (!newRuleText.trim()) return;
    const newRule: ShieldRule = {
      id: String(Date.now()),
      cardId: selectedCard,
      ruleText: newRuleText,
      ruleType: newRuleType,
      isActive: true,
      parameters: {},
    };
    setRules(prev => [...prev, newRule]);
    setNewRuleText('');
    setShowAddRule(false);
  };

  const handleEmergencyAction = (activate: boolean) => {
    if (!emergencyPasscode) {
      setEmergencyMessage('Set your 6-digit emergency PIN in Account settings first.');
      return;
    }

    if (!/^[0-9]{6}$/.test(emergencyPinInput)) {
      setEmergencyMessage('Enter your 6-digit emergency PIN.');
      return;
    }

    if (emergencyPinInput !== emergencyPasscode) {
      setEmergencyMessage('Incorrect PIN. Try again.');
      return;
    }

    if (activate) {
      onSetEmergencyLockTarget(selectedEmergencyPhone);
    }

    onSetEmergencyLockActive(activate);
    const timestamp = new Date().toLocaleString('de-DE');
    const event = activate
      ? `Emergency lock activated · ${timestamp}`
      : `Emergency unlock completed · ${timestamp}`;
    onLogEvent(event);
    setEmergencyMessage(activate
      ? `${selectedEmergencyPhone} is now blocked and trackable. Cards blocked from this phone.`
      : 'Mobile access restored. Cards are available again from the phone.');
    setEmergencyPinInput('');
    setTimeout(() => {
      setShowEmergencyModal(false);
      setShowUnlockModal(false);
      setEmergencyMessage('');
    }, 1400);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Shield</h1>
          <p className="text-sm text-slate-400 mt-0.5">Protection without paranoia</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="ml-0 sm:ml-3 flex items-center gap-2">
            {emergencyLockActive ? (
              <Button variant="secondary" size="sm" onClick={() => setShowUnlockModal(true)}>
                Unlock Device
              </Button>
            ) : (
              <Button variant="danger" size="sm" onClick={() => setShowEmergencyModal(true)}>
                Emergency
              </Button>
            )}
          </div>
        </div>
        {emergencyLockActive && (
          <div className="mt-2 text-sm text-slate-400">
            Blocked device: <span className="font-semibold text-white">{emergencyLockTarget}</span>
          </div>
        )}
      </div>

      {emergencyLog && (
        <GlassCard className="p-4 border-red-700 bg-red-950/70 text-slate-100">
          <div className="text-xs text-red-300 mb-2">Emergency Activity</div>
          <div className="text-sm">{emergencyLog}</div>
        </GlassCard>
      )}

      {/* Cards */}
      <div>
        <h2 className="text-sm font-medium text-slate-400 mb-3">Your Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {cards.map(card => (
            <CardItem key={card.id} card={card} isSelected={selectedCard === card.id} onClick={() => setSelectedCard(card.id)} />
          ))}
          {cards.length === 0 && (
            <div className="col-span-1 md:col-span-3 rounded-xl border border-slate-700 bg-slate-950/80 p-6 text-slate-400 text-center">
                No cards available.
              </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        {/* Rules */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-slate-400">Active Rules</h2>
            <Button variant="shield" size="sm" onClick={() => setShowAddRule(true)}>
              <Plus size={14} /> Add Rule
            </Button>
          </div>
          <div className="space-y-2">
            {cardRules.map(rule => (
              <RuleItem key={rule.id} rule={rule} onToggle={toggleRule} />
            ))}
            {cardRules.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Shield size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No rules for this card yet</p>
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-slate-400">Family Shield Rules</h2>
            <span className="text-xs text-slate-500">Shared across your family</span>
          </div>
          <div className="space-y-2">
            {familyRulesList.map(rule => (
              <RuleItem key={rule.id} rule={rule} onToggle={toggleRule} />
            ))}
            {familyRulesList.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Shield size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No shared shield rules configured yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div>
        <h2 className="text-sm font-medium text-slate-400 mb-3">Recent Transactions</h2>
        <div className="space-y-2">
          {transactions.length > 0 ? (
            transactions.slice(0, 5).map(tx => (
              <TransactionItem key={tx.id} tx={tx} />
            ))
          ) : (
            <div className="rounded-xl border border-slate-700 bg-slate-950/80 p-4 text-slate-400 text-sm">
              No recent transactions
            </div>
          )}
        </div>
      </div>

      

      <GlassCard className="p-4 mt-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-full bg-slate-900/80 p-3">
            <Shield size={18} className="text-slate-300" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">NataMirror — Financial Twin</h2>
            <p className="text-xs text-slate-400">Connected to your local Pi insights.</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/80 p-4 text-slate-400 text-sm">
          NataMirror is ready. Real-time analytics will appear here when available.
        </div>
      </GlassCard>

      <GlassCard className="p-6 space-y-4 bg-slate-950/90 border-slate-700">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">NataScan</h2>
            <p className="mt-2 text-sm text-slate-400 max-w-xl">
              Check any link before you click it. Paste it. We&apos;ll check it against community reports instantly.
            </p>
          </div>
          <Button variant="primary" onClick={() => setScanOpen(prev => !prev)}>
            {scanOpen ? 'Close NataScan' : 'Open NataScan'}
          </Button>
        </div>

        {scanOpen ? (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-5">
              <div className="space-y-3">
                <label className="text-xs uppercase tracking-[0.24em] text-slate-500">Scan a link</label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={scanInput}
                    onChange={e => setScanInput(e.target.value)}
                    placeholder="Paste a suspicious link here..."
                    className="glass-input w-full min-w-0 rounded-full px-5 py-4 text-sm text-white placeholder-slate-500 outline-none"
                  />
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleRunScan}
                    disabled={scanning}
                    className="shrink-0"
                  >
                    {scanning ? 'Scanning...' : 'Scan Now'}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">Recent scans update automatically after each check.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {recentScans.length > 0 ? recentScans.map(scan => (
                  <div key={scan.id} className={`rounded-3xl border p-4 ${getStatusStyles(scan)} border-opacity-80`}>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-sm font-semibold text-white truncate">{scan.hostname}</span>
                      <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{scan.status}</span>
                    </div>
                    <p className="text-xs text-slate-300 mb-1">{scan.reportCount} reports</p>
                    <p className="text-xs text-slate-300">{scan.firstSeen}</p>
                  </div>
                )) : (
                  <div className="col-span-1 sm:col-span-3 rounded-3xl border border-slate-700 bg-slate-950/80 p-5 text-sm text-slate-400">
                    No scans yet. Paste a link and press Scan Now to see results.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className={`relative overflow-hidden rounded-[2rem] border p-6 ${getStatusStyles(scanResult ?? undefined)} border-opacity-70`}>
                <div className={`pointer-events-none absolute inset-0 ${scanResult?.status === 'danger' ? 'bg-red-500/10 animate-pulse-slow' : scanResult?.status === 'suspicious' ? 'bg-amber-500/10 animate-pulse-slow' : scanResult?.status === 'safe' ? 'bg-emerald-500/10 animate-pulse-slow' : 'bg-slate-950/90'}`} />
                <div className="relative z-10 space-y-5">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/90 p-5">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/80 text-xl text-white">
                        {scanning ? (
                          <div className="h-3.5 w-3.5 rounded-full bg-slate-300 animate-pulse" />
                        ) : scanResult ? (
                          scanResult.status === 'danger' ? <AlertTriangle size={18} className="text-red-400" /> : scanResult.status === 'suspicious' ? <Eye size={18} className="text-amber-400" /> : <CheckCircle size={18} className="text-emerald-400" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full bg-slate-700" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white break-words">{scanning ? 'Scanning...' : scanResult?.title || 'Paste a suspicious link and scan it now.'}</p>
                        <p className="text-xs text-slate-400 break-words">{scanning ? scanMessage : scanResult ? 'Scan completed. Review the result below.' : 'Start by pasting a suspicious link above.'}</p>
                      </div>
                    </div>

                    <div className="mt-5 h-56 rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-4">
                      <div className="relative flex h-full items-center justify-center">
                        <div className={`relative flex h-44 w-44 items-center justify-center rounded-full border border-white/10 ${scanning ? 'animate-radar-sweep' : ''}`}>
                          <div className="absolute inset-0 rounded-full bg-white/5 blur-sm" />
                          <div className="absolute inset-10 rounded-full border border-white/10 opacity-50" />
                          <div className="absolute inset-16 rounded-full border border-white/10 opacity-30" />
                          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-300/30 to-transparent opacity-60 blur-xl" style={{ transform: 'rotate(30deg)' }} />
                          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-slate-950/0 to-transparent" />
                          <div className="absolute h-12 w-1 rounded-full bg-cyan-200/80 blur-sm" style={{ transform: 'translateX(-50%) translateY(-50%) rotate(-60deg)' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {scanResult && (
                    <div className="rounded-3xl border border-white/10 bg-slate-950/90 p-5 text-sm text-slate-100">
                      <div className="mb-4">
                        <p className="text-lg font-semibold text-white">{scanResult.title}</p>
                        <p className="mt-3 text-base font-medium text-white truncate">{scanResult.hostname}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 text-sm text-slate-300">
                        <div className="space-y-1">
                          <p>{scanResult.reportCount} community reports</p>
                          <p>First seen: {scanResult.firstSeen}</p>
                        </div>
                        <div className="space-y-1">
                          <p>Category: {scanResult.category}</p>
                          <p>Domain age: {scanResult.domainAge}</p>
                        </div>
                        {scanResult.matchPercent !== undefined && (
                          <p>Fake domain match: {scanResult.matchPercent}%</p>
                        )}
                        {/* Trusted nodes display removed per request */}
                      </div>

                      <div className="mt-4 space-y-2 text-slate-300">
                        {scanResult.notes.map(note => (
                          <p key={note}>{note}</p>
                        ))}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <Button variant={scanResult.status === 'danger' ? 'danger' : 'secondary'} onClick={handleReportCommunity}>
                          {scanResult.status === 'danger' ? 'Report to Community' : 'Report Suspicious'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-5 text-sm text-slate-400">
            NataScan is ready. Click Open NataScan to inspect any suspicious link against community reports.
          </div>
        )}
      </GlassCard>

      <Modal isOpen={showAddRule} onClose={() => setShowAddRule(false)} title="Add Shield Rule">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Rule Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['spending_limit', 'time_restriction', 'seller_verification', 'category_block', 'custom'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setNewRuleType(type)}
                  className={`p-2 rounded-lg text-xs font-medium transition-all border ${newRuleType === type ? 'bg-slate-800/80 border-slate-600 text-slate-200' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:bg-slate-900/90'}`}
                >
                  {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Describe your rule</label>
            <input
              type="text"
              value={newRuleText}
              onChange={e => setNewRuleText(e.target.value)}
              placeholder="e.g., Ask me before any purchase over 50 EUR"
              className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowAddRule(false)}>Cancel</Button>
            <Button variant="shield" onClick={addRule}>Add Rule</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEmergencyModal || showUnlockModal}
        onClose={() => {
          setShowEmergencyModal(false);
          setShowUnlockModal(false);
          setEmergencyMessage('');
        }}
        title={showUnlockModal ? 'Unlock Device' : 'Emergency Lock'}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            {showUnlockModal
              ? 'Enter your emergency PIN to restore mobile access to cards.'
              : 'Choose a device to track.'}
          </p>

          {!showUnlockModal && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400">Select the phone to block</div>
              <div className="grid gap-2 sm:grid-cols-3">
                {phoneOptions.map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSelectedEmergencyPhone(option)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition-all duration-200 ${selectedEmergencyPhone === option ? 'border-red-500 bg-red-500/10 text-white shadow-sm shadow-red-500/20' : 'border-slate-700 bg-slate-950/90 text-slate-300 hover:bg-slate-900/95'}`}
                  >
                    <div className="font-medium">{option}</div>
                    <div className="text-xs text-slate-500 mt-1">Block and track this phone from the app</div>
                  </button>
                ))}
              </div>
              <div className="text-xs text-slate-400">
                Your current device stays active. The blocked phone will receive the tracking notification.
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Emergency PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={emergencyPinInput}
              onChange={e => setEmergencyPinInput(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none"
              placeholder="6-digit PIN"
            />
          </div>
          {emergencyMessage && (
            <div className="text-sm text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-700">
              {emergencyMessage}
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => {
              setShowEmergencyModal(false);
              setShowUnlockModal(false);
              setEmergencyMessage('');
            }}>Cancel</Button>
            <Button
              variant={showUnlockModal ? 'secondary' : 'danger'}
              onClick={() => handleEmergencyAction(showUnlockModal ? false : true)}
            >
              {showUnlockModal ? 'Unlock Device' : 'Lock Phone'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
