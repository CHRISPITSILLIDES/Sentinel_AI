import { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Plus, ChevronRight, Flag, Eye, Clock, Ban, DollarSign } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { GlassCard } from '../ui/GlassCard';
import { Modal } from '../ui/Modal';
import { mockCards, mockShieldRules, mockTransactions, mockScamReports } from '../../stores/appStore';
import type { Card, ShieldRule, Transaction } from '../../stores/appStore';

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

function TransactionItem({ tx, onApprove }: { tx: Transaction; onApprove: (id: string) => void }) {
  const statusConfig: Record<string, { icon: React.ReactNode; badge: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; label: string }> = {
    approved: { icon: <CheckCircle size={16} className="text-slate-300" />, badge: 'success', label: 'Approved' },
    blocked: { icon: <XCircle size={16} className="text-slate-300" />, badge: 'danger', label: 'Blocked' },
    pending: { icon: <Clock size={16} className="text-slate-300" />, badge: 'warning', label: 'Pending' },
    flagged: { icon: <AlertTriangle size={16} className="text-slate-300" />, badge: 'warning', label: 'Flagged' },
  };

  const config = statusConfig[tx.status];

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

          {(tx.status === 'blocked' || tx.isScamReport) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400">Fake domain:</span>
              <Badge variant={_matchPercent > 70 ? 'danger' : _matchPercent > 40 ? 'warning' : 'neutral'}>{_matchPercent}% match</Badge>
              <Badge variant={_reportCount > 10 ? 'danger' : _reportCount > 0 ? 'warning' : 'neutral'}>Reported {_reportCount}×</Badge>
              <Badge variant="info">{_firstSeenDays !== undefined ? `First seen: ${_firstSeenDays} days ago` : 'First seen: unknown'}</Badge>
            </div>
          )}

          {tx.status === 'blocked' && (
            <Button variant="ghost" size="sm" className="mt-2 text-slate-200 hover:text-white" onClick={() => onApprove(tx.id)}>
              Proceed Anyway <ChevronRight size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ShieldDashboard() {
  const [selectedCard, setSelectedCard] = useState<string>('1');
  const [rules, setRules] = useState(mockShieldRules);
  const [transactions, setTransactions] = useState(mockTransactions);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRuleText, setNewRuleText] = useState('');
  const [newRuleType, setNewRuleType] = useState<ShieldRule['ruleType']>('custom');

  const cardRules = rules.filter(r => r.cardId === selectedCard);
  const blockedCount = transactions.filter(t => t.status === 'blocked').length;
  const approvedCount = transactions.filter(t => t.status === 'approved').length;

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  const approveTransaction = (id: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'approved' as const, blockReason: undefined } : t));
  };

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Shield</h1>
          <p className="text-sm text-slate-400 mt-0.5">Protection without paranoia</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-red-400">Blocked today</div>
            <div className="text-lg font-bold text-red-300">{blockedCount}</div>
          </div>
          <div className="w-px h-8 bg-slate-700" />
          <div className="text-right">
            <div className="text-xs text-green-400">Approved</div>
            <div className="text-lg font-bold text-green-300">{approvedCount}</div>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div>
        <h2 className="text-sm font-medium text-slate-400 mb-3">Your Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {mockCards.map(card => (
            <CardItem key={card.id} card={card} isSelected={selectedCard === card.id} onClick={() => setSelectedCard(card.id)} />
          ))}
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
      </div>

      {/* Transactions */}
      <div>
        <h2 className="text-sm font-medium text-slate-400 mb-3">Recent Transactions</h2>
        <div className="space-y-2">
          {transactions.slice(0, 5).map(tx => (
            <TransactionItem key={tx.id} tx={tx} onApprove={approveTransaction} />
          ))}
        </div>
      </div>

      {/* Scam Reports */}
      <div>
        <h2 className="text-sm font-medium text-slate-400 mb-3">Flagged Sellers</h2>
        <div className="space-y-2">
          {mockScamReports.map(report => (
            <div key={report.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/90 border border-slate-700">
              <Flag size={16} className="text-slate-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{report.sellerName}</p>
                <p className="text-xs text-slate-400 truncate">{report.description}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-slate-200 font-medium">{report.reportCount} reports</div>
                <Badge variant={report.verified ? 'success' : 'warning'}>{report.verified ? 'Verified' : 'Unverified'}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <GlassCard className="p-4 mt-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-full bg-slate-900/80 p-3">
            <Shield size={18} className="text-slate-300" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">NataID — Your Financial Passport</h2>
            <p className="text-xs text-slate-400">A cryptographic identity generated only on your Pi.</p>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          No email. No username. No account with anyone. Your Pi creates a unique key on first boot, and that identity stays local to your device.
        </p>
        <div className="mt-3 p-3 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-400 text-sm">
          When you contribute scam reports to the community, you are not just “User #4821”. You are a verified node with a reputation score.
          The more accurate reports you submit, the higher your node trust score, and the more weight your reports carry.
        </div>
      </GlassCard>

      <GlassCard className="p-4 mt-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-full bg-slate-900/80 p-3">
            <Shield size={18} className="text-slate-300" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">NataMirror — Your Financial Digital Twin</h2>
            <p className="text-xs text-slate-400">Built from 30 days of local behavior, it watches you so you can stay one step ahead.</p>
          </div>
        </div>
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Your Pi learns every transaction, every block, and every goal hit or miss. The model stays on your device and is never stored in the cloud.
          </p>
          <p>
            It predicts what you are likely to do next: overspending trends, impulse purchases, and goal slippage.
          </p>
        </div>
        <div className="mt-3 grid gap-2">
          <div className="rounded-xl bg-slate-900/80 border border-slate-700 p-3 text-slate-200">
            <p className="text-xs text-slate-400">Prediction</p>
            <p className="text-sm font-medium">Based on your pattern, you will overspend on food this week by €47.</p>
          </div>
          <div className="rounded-xl bg-slate-900/80 border border-slate-700 p-3 text-slate-200">
            <p className="text-xs text-slate-400">Insight</p>
            <p className="text-sm font-medium">You typically impulse-spend on Fridays after 9pm.</p>
          </div>
          <div className="rounded-xl bg-slate-900/80 border border-slate-700 p-3 text-slate-200">
            <p className="text-xs text-slate-400">Warning</p>
            <p className="text-sm font-medium">At your current rate, you'll miss your Summer Vacation goal by 23 days.</p>
          </div>
        </div>
        <div className="mt-3 p-3 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-400 text-sm">
          When you are about to make a purchase your twin thinks you'll regret, it will challenge you with a real question.
          “You've made this exact purchase 3 times before. You returned it twice. Still want to proceed?”
        </div>
      </GlassCard>

      {/* Add Rule Modal */}
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
    </div>
  );
}
