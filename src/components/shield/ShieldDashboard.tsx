import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Ban, CheckCircle, Clock, DollarSign, Eye, Flag, Plus, ScanLine, Shield, Sparkles, Target, XCircle } from 'lucide-react';
import { subscribeToAppActions } from '../../lib/actions';
import { analyzeDecision, DecisionInput, DecisionResult, validateDecisionInput } from '../../lib/decisionEngine';
import { usePersistentState } from '../../lib/storage';
import { mockCards, mockCategoryLimits, mockGoals, mockScamReports, mockShieldRules, mockTransactions } from '../../stores/appStore';
import type { Card, CategoryLimit, Goal, ScamReport, ShieldRule, Transaction } from '../../stores/appStore';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { GlassCard } from '../ui/GlassCard';
import { Modal } from '../ui/Modal';

const categories = ['food', 'shopping', 'entertainment', 'transport', 'travel', 'electronics', 'health', 'education', 'gambling', 'other'];

const demoInput: DecisionInput = {
  sellerName: 'Secure-Bank-Verify.xyz',
  sellerUrl: 'https://secure-bank-verify.xyz/login',
  content: 'URGENT: Your bank account will be locked within 30 minutes. Send EUR 480 in crypto and share the authentication code to restore access.',
  amount: 480,
  category: 'shopping',
  cardId: '1',
  cardBalance: 4250.8,
};

function riskVariant(level: DecisionResult['level']): 'success' | 'warning' | 'danger' | 'neutral' {
  if (level === 'low') return 'success';
  if (level === 'medium') return 'warning';
  return 'danger';
}

function CardItem({ card, selected, onClick }: { card: Card; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={!card.isActive} className={`w-full rounded-xl p-4 text-left transition-all bg-slate-950/90 border ${selected ? 'border-blue-400 ring-1 ring-blue-400/30' : 'border-slate-700 hover:border-slate-500'} disabled:opacity-40`}>
      <div className="flex items-center justify-between text-xs text-slate-400"><span>{card.brand}</span><span>{card.isActive ? card.cardType : 'paused'}</span></div>
      <div className="my-3 font-mono text-white">•••• •••• •••• {card.lastFour}</div>
      <div className="flex items-center justify-between gap-2"><span className="text-sm text-white">{card.name}</span><span className="text-sm font-semibold text-white">{card.balance.toLocaleString('de-DE', { style: 'currency', currency: card.currency })}</span></div>
    </button>
  );
}

function RuleItem({ rule, onToggle }: { rule: ShieldRule; onToggle: (id: string) => void }) {
  const icons = { spending_limit: <DollarSign size={16} />, time_restriction: <Clock size={16} />, seller_verification: <Eye size={16} />, category_block: <Ban size={16} />, custom: <Shield size={16} /> };
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/90 border border-slate-700">
      <div className="p-2 rounded-lg bg-slate-900 text-slate-300">{icons[rule.ruleType]}</div>
      <p className="flex-1 text-sm text-slate-200">{rule.ruleText}</p>
      <button aria-label={`${rule.isActive ? 'Disable' : 'Enable'} rule`} onClick={() => onToggle(rule.id)} className={`w-10 h-6 rounded-full relative transition-colors ${rule.isActive ? 'bg-blue-600' : 'bg-slate-700'}`}><span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${rule.isActive ? 'left-5' : 'left-1'}`} /></button>
    </div>
  );
}

export function ShieldDashboard() {
  const [cards, setCards] = usePersistentState<Card[]>('cards', mockCards);
  const [rules, setRules] = usePersistentState<ShieldRule[]>('shield-rules', mockShieldRules);
  const [transactions, setTransactions] = usePersistentState<Transaction[]>('shield-transactions', mockTransactions);
  const [reports, setReports] = usePersistentState<ScamReport[]>('scam-reports', mockScamReports);
  const [goals] = usePersistentState<Goal[]>('goals', mockGoals);
  const [limits, setLimits] = usePersistentState<CategoryLimit[]>('category-limits', mockCategoryLimits);
  const [decision, setDecision] = usePersistentState<DecisionResult | null>('latest-decision', null);
  const [, setDecisionHistory] = usePersistentState<DecisionResult[]>('decision-history', []);
  const [selectedCard, setSelectedCard] = useState(cards.find(card => card.isActive)?.id || cards[0]?.id || '1');
  const selected = cards.find(card => card.id === selectedCard) || cards[0];
  const [form, setForm] = useState<DecisionInput>({ sellerName: '', sellerUrl: '', content: '', amount: 0, category: 'shopping', cardId: selectedCard, cardBalance: selected?.balance || 0 });
  const [errors, setErrors] = useState<Partial<Record<keyof DecisionInput, string>>>({});
  const [showAddRule, setShowAddRule] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [newRuleText, setNewRuleText] = useState('');
  const [newRuleType, setNewRuleType] = useState<ShieldRule['ruleType']>('custom');
  const [newRuleValue, setNewRuleValue] = useState('');
  const [reportForm, setReportForm] = useState({ sellerName: '', sellerUrl: '', description: '' });

  const blockedCount = transactions.filter(transaction => transaction.status === 'blocked').length;
  const approvedCount = transactions.filter(transaction => transaction.status === 'approved').length;
  useEffect(() => {
    if (!selected) return;
    setForm(previous => ({ ...previous, cardId: selected.id, cardBalance: selected.balance }));
  }, [selectedCard, selected?.balance]);

  useEffect(() => subscribeToAppActions(action => {
    if (action === 'shield_add_rule' || action === 'shield_spending_limit') {
      setNewRuleType(action === 'shield_spending_limit' ? 'spending_limit' : 'custom');
      setShowAddRule(true);
    }
    if (action === 'shield_block_unverified') {
      setNewRuleType('seller_verification');
      setNewRuleText('Block unverified sellers');
      setShowAddRule(true);
    }
    if (action === 'shield_report_scam') setShowReport(true);
    if (action === 'shield_demo') loadDemo();
  }), []);

  const cardRules = useMemo(() => rules.filter(rule => rule.cardId === selectedCard), [rules, selectedCard]);

  const loadDemo = () => {
    const card = cards.find(item => item.id === '1') || selected;
    if (card) setSelectedCard(card.id);
    setForm({ ...demoInput, cardId: card?.id || '1', cardBalance: card?.balance || demoInput.cardBalance });
    setErrors({});
    setDecision(null);
  };

  const scan = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateDecisionInput(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const result = analyzeDecision(form, { rules, reports, goals, categoryLimits: limits });
    setDecision(result);
    setDecisionHistory(previous => [result, ...previous].slice(0, 20));
    const transaction: Transaction = {
      id: result.id,
      cardId: form.cardId,
      sellerName: form.sellerName.trim(),
      sellerUrl: form.sellerUrl?.trim() || undefined,
      amount: form.amount,
      currency: 'EUR',
      category: form.category,
      status: result.action === 'block' ? 'blocked' : 'pending',
      blockReason: result.action === 'block' ? result.summary : undefined,
      isScamReport: result.score >= 50,
      createdAt: result.createdAt,
    };
    setTransactions(previous => [transaction, ...previous.filter(item => item.id !== transaction.id)]);
  };

  const resolveDecision = (resolution: 'approved' | 'blocked') => {
    if (!decision) return;
    setTransactions(previous => previous.map(transaction => transaction.id === decision.id ? { ...transaction, status: resolution, blockReason: resolution === 'blocked' ? decision.summary : undefined } : transaction));
    if (resolution === 'approved') {
      setCards(previous => previous.map(card => card.id === decision.input.cardId ? { ...card, balance: Math.max(0, card.balance - decision.input.amount) } : card));
      setLimits(previous => previous.map(limit => limit.category === decision.input.category ? { ...limit, currentSpent: limit.currentSpent + decision.input.amount } : limit));
    }
    setDecision(previous => previous ? { ...previous, action: resolution === 'approved' ? 'approve' : 'block', summary: resolution === 'approved' ? 'You approved this simulated payment after reviewing the evidence.' : 'You blocked this simulated payment and preserved the selected balance.' } : previous);
  };

  const addRule = () => {
    const numericValue = Number(newRuleValue);
    const generatedText = newRuleType === 'spending_limit' && numericValue > 0 ? `Ask me before any purchase over ${numericValue} EUR`
      : newRuleType === 'time_restriction' && numericValue >= 0 ? `No online shopping after ${String(numericValue).padStart(2, '0')}:00`
      : newRuleType === 'category_block' && newRuleValue ? `Block ${newRuleValue} transactions`
      : newRuleType === 'seller_verification' ? 'Block unverified sellers'
      : newRuleText.trim();
    if (!generatedText) return;
    const parameters = newRuleType === 'spending_limit' ? { limit: numericValue }
      : newRuleType === 'time_restriction' ? { afterHour: numericValue }
      : newRuleType === 'category_block' ? { category: newRuleValue }
      : {};
    setRules(previous => [...previous, { id: crypto.randomUUID(), cardId: selectedCard, ruleText: generatedText, ruleType: newRuleType, isActive: true, parameters }]);
    setNewRuleText('');
    setNewRuleValue('');
    setShowAddRule(false);
  };

  const addReport = () => {
    if (!reportForm.sellerName.trim() || !reportForm.description.trim()) return;
    setReports(previous => [{ id: crypto.randomUUID(), sellerName: reportForm.sellerName.trim(), sellerUrl: reportForm.sellerUrl.trim() || undefined, description: reportForm.description.trim(), reportType: 'local_report', verified: false, reportCount: 1, createdAt: new Date().toISOString() }, ...previous]);
    setReportForm({ sellerName: '', sellerUrl: '', description: '' });
    setShowReport(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><h1 className="text-2xl font-bold text-white">Decision Shield</h1><p className="text-sm text-slate-400 mt-1">Explain a payment before money moves.</p></div>
        <div className="flex items-center gap-4 text-right"><div><div className="text-xs text-red-400">Blocked</div><div className="text-lg font-bold text-red-300">{blockedCount}</div></div><div className="w-px h-8 bg-slate-700" /><div><div className="text-xs text-green-400">Approved</div><div className="text-lg font-bold text-green-300">{approvedCount}</div></div></div>
      </div>

      <GlassCard className="p-5 border-blue-500/20" gradient>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="flex items-center gap-2 text-blue-200"><Sparkles size={16} /><span className="text-xs font-semibold uppercase tracking-wider">Hackathon demo path</span></div><h2 className="text-lg font-semibold text-white mt-1">Can nataCONNECT stop a fake bank payment?</h2><p className="text-sm text-slate-400 mt-1">Load the scenario, inspect transparent evidence, then block or approve it.</p></div>
          <Button variant="primary" onClick={loadDemo}><Sparkles size={15} /> Load bank scam</Button>
        </div>
      </GlassCard>

      <div><h2 className="text-sm font-medium text-slate-400 mb-3">Payment source</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-3">{cards.map(card => <CardItem key={card.id} card={card} selected={selectedCard === card.id} onClick={() => setSelectedCard(card.id)} />)}</div></div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4"><div><h2 className="font-semibold text-white flex items-center gap-2"><ScanLine size={18} /> Analyze a proposed payment</h2><p className="text-xs text-slate-400 mt-1">Everything is evaluated locally with deterministic rules.</p></div></div>
          <form onSubmit={scan} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs text-slate-400">Seller or sender<input value={form.sellerName} onChange={event => setForm({ ...form, sellerName: event.target.value })} className="mt-1 w-full glass-input rounded-xl px-4 py-3 text-sm text-white" placeholder="Example Bank Support" />{errors.sellerName && <span className="text-red-300 mt-1 block">{errors.sellerName}</span>}</label>
              <label className="text-xs text-slate-400">Website or link<input value={form.sellerUrl || ''} onChange={event => setForm({ ...form, sellerUrl: event.target.value })} className="mt-1 w-full glass-input rounded-xl px-4 py-3 text-sm text-white" placeholder="https://example.com" />{errors.sellerUrl && <span className="text-red-300 mt-1 block">{errors.sellerUrl}</span>}</label>
            </div>
            <label className="text-xs text-slate-400">Message or payment request<textarea value={form.content || ''} onChange={event => setForm({ ...form, content: event.target.value })} className="mt-1 w-full h-28 glass-input rounded-xl px-4 py-3 text-sm text-white resize-none" placeholder="Paste the suspicious message or describe the request..." /></label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs text-slate-400">Amount (EUR)<input type="number" min="0.01" step="0.01" value={form.amount || ''} onChange={event => setForm({ ...form, amount: Number(event.target.value) })} className="mt-1 w-full glass-input rounded-xl px-4 py-3 text-sm text-white" />{errors.amount && <span className="text-red-300 mt-1 block">{errors.amount}</span>}</label>
              <label className="text-xs text-slate-400">Category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} className="mt-1 w-full glass-input rounded-xl px-4 py-3 text-sm text-white bg-slate-950">{categories.map(category => <option key={category}>{category}</option>)}</select></label>
            </div>
            <Button variant="shield" className="w-full"><ScanLine size={16} /> Analyze payment</Button>
          </form>
        </GlassCard>

        <GlassCard className="p-5 min-h-[32rem]">
          {!decision ? <div className="h-full min-h-[28rem] grid place-items-center text-center"><div><Shield size={42} className="mx-auto text-slate-600" /><h2 className="text-white font-semibold mt-3">Evidence will appear here</h2><p className="text-sm text-slate-500 mt-1 max-w-sm">The score combines message patterns, domain structure, reports, card rules, category limits, balance share, and protected goals.</p></div></div> : <div className="space-y-4">
            <div className="flex items-start justify-between gap-3"><div><Badge variant={riskVariant(decision.level)}>{decision.level.toUpperCase()} RISK</Badge><div className="text-4xl font-bold text-white mt-2">{decision.score}<span className="text-base text-slate-500">/100</span></div></div><div className={`w-12 h-12 rounded-2xl grid place-items-center ${decision.action === 'block' ? 'bg-red-500/15 text-red-300' : decision.action === 'review' ? 'bg-amber-500/15 text-amber-300' : 'bg-green-500/15 text-green-300'}`}>{decision.action === 'block' ? <XCircle /> : decision.action === 'review' ? <AlertTriangle /> : <CheckCircle />}</div></div>
            <div><h2 className="text-lg font-semibold text-white capitalize">Recommended: {decision.action}</h2><p className="text-sm text-slate-300 mt-1">{decision.summary}</p></div>
            <div className="space-y-2">{decision.evidence.length ? decision.evidence.map(item => <div key={item.id} className="p-3 rounded-xl bg-slate-950/90 border border-slate-700"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-white">{item.label}</span><span className={`text-xs ${item.points >= 20 ? 'text-red-300' : 'text-amber-300'}`}>+{item.points}</span></div><p className="text-xs text-slate-400 mt-1">{item.detail}</p></div>) : <p className="text-sm text-green-300">No warning evidence found.</p>}</div>
            <div className="grid grid-cols-2 gap-3"><Button variant="danger" onClick={() => resolveDecision('blocked')}><XCircle size={15} /> Block</Button><Button variant="secondary" onClick={() => resolveDecision('approved')} disabled={decision.input.amount > decision.input.cardBalance}><CheckCircle size={15} /> Approve anyway</Button></div>
            <p className="text-[11px] text-slate-500">This prototype explains risk; it cannot stop a real bank transfer.</p>
          </div>}
        </GlassCard>
      </div>

      {decision && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div><h2 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2"><Target size={15} /> Goal consequences</h2><div className="space-y-2">{decision.goalImpact.slice(0, 4).map(impact => <div key={impact.goalId} className="p-3 rounded-xl bg-slate-950/90 border border-slate-700 flex items-center justify-between gap-3"><div><div className="text-sm text-white flex items-center gap-2">{impact.goalName}{impact.protected && <Badge variant="info">Protected</Badge>}</div><p className="text-xs text-slate-400 mt-1">Could add EUR {impact.additionalMonthlyNeeded.toFixed(2)}/month to stay on schedule</p></div><div className="text-right"><div className="text-sm font-semibold text-amber-300">~{impact.estimatedDelayDays} days</div><div className="text-[10px] text-slate-500">estimated delay</div></div></div>)}</div></div>
        <div><div className="flex items-center justify-between mb-3"><h2 className="text-sm font-medium text-slate-400">Selected card rules</h2><Button variant="shield" size="sm" onClick={() => setShowAddRule(true)}><Plus size={14} /> Add rule</Button></div><div className="space-y-2">{cardRules.map(rule => <RuleItem key={rule.id} rule={rule} onToggle={id => setRules(previous => previous.map(item => item.id === id ? { ...item, isActive: !item.isActive } : item))} />)}</div></div>
      </div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div><h2 className="text-sm font-medium text-slate-400 mb-3">Recent decisions</h2><div className="space-y-2">{transactions.slice(0, 5).map(transaction => <div key={transaction.id} className="p-3 rounded-xl bg-slate-950/90 border border-slate-700 flex items-center gap-3"><div>{transaction.status === 'approved' ? <CheckCircle size={16} className="text-green-300" /> : transaction.status === 'blocked' ? <XCircle size={16} className="text-red-300" /> : <Clock size={16} className="text-amber-300" />}</div><div className="flex-1"><div className="text-sm text-white">{transaction.sellerName}</div><div className="text-xs text-slate-400">EUR {transaction.amount.toFixed(2)} · {transaction.category}</div></div><Badge variant={transaction.status === 'approved' ? 'success' : transaction.status === 'blocked' ? 'danger' : 'warning'}>{transaction.status}</Badge></div>)}</div></div>
        <div><div className="flex items-center justify-between mb-3"><h2 className="text-sm font-medium text-slate-400">Local seller reports</h2><Button variant="secondary" size="sm" onClick={() => setShowReport(true)}><Flag size={14} /> Add report</Button></div><div className="space-y-2">{reports.slice(0, 5).map(report => <div key={report.id} className="p-3 rounded-xl bg-slate-950/90 border border-slate-700 flex items-center gap-3"><Flag size={15} className="text-amber-300" /><div className="flex-1"><div className="text-sm text-white">{report.sellerName}</div><div className="text-xs text-slate-400 truncate">{report.description}</div></div><Badge variant="warning">{report.reportCount} report{report.reportCount === 1 ? '' : 's'}</Badge></div>)}</div></div>
      </div>

      <GlassCard className="p-4"><div className="flex items-start gap-3"><Shield size={18} className="text-blue-300 mt-0.5" /><div><h2 className="text-sm font-semibold text-white">What is genuinely implemented</h2><p className="text-xs text-slate-400 mt-1 leading-relaxed">A local, explainable rules engine, persistent simulated balances and decisions, user-defined rules and reports, category-limit checks, and goal-impact estimates. No bank connection, crowdsourced reputation network, cryptographic identity, or behavioral prediction service is claimed.</p></div></div></GlassCard>

      <Modal isOpen={showAddRule} onClose={() => setShowAddRule(false)} title="Add a card rule"><div className="space-y-4"><div className="grid grid-cols-2 gap-2">{(['spending_limit', 'time_restriction', 'seller_verification', 'category_block', 'custom'] as const).map(type => <button key={type} onClick={() => { setNewRuleType(type); setNewRuleValue(''); }} className={`p-2 rounded-lg text-xs border ${newRuleType === type ? 'bg-blue-500/15 border-blue-400 text-blue-200' : 'border-slate-700 text-slate-400'}`}>{type.replace('_', ' ')}</button>)}</div>{newRuleType === 'spending_limit' && <input type="number" min="1" value={newRuleValue} onChange={event => setNewRuleValue(event.target.value)} placeholder="Approval threshold in EUR" className="w-full glass-input rounded-xl px-4 py-3 text-sm" />}{newRuleType === 'time_restriction' && <input type="number" min="0" max="23" value={newRuleValue} onChange={event => setNewRuleValue(event.target.value)} placeholder="Block after hour (0-23)" className="w-full glass-input rounded-xl px-4 py-3 text-sm" />}{newRuleType === 'category_block' && <select value={newRuleValue} onChange={event => setNewRuleValue(event.target.value)} className="w-full glass-input rounded-xl px-4 py-3 text-sm bg-slate-950"><option value="">Choose category</option>{categories.map(category => <option key={category}>{category}</option>)}</select>}{newRuleType === 'custom' && <input value={newRuleText} onChange={event => setNewRuleText(event.target.value)} placeholder="Describe the reminder or rule" className="w-full glass-input rounded-xl px-4 py-3 text-sm" />}{newRuleType === 'seller_verification' && <p className="text-sm text-slate-300">This requires review when a website has no matching local seller report or verification record.</p>}<div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setShowAddRule(false)}>Cancel</Button><Button variant="shield" onClick={addRule}>Add rule</Button></div></div></Modal>
      <Modal isOpen={showReport} onClose={() => setShowReport(false)} title="Add a local seller report"><div className="space-y-4"><input value={reportForm.sellerName} onChange={event => setReportForm({ ...reportForm, sellerName: event.target.value })} placeholder="Seller name" className="w-full glass-input rounded-xl px-4 py-3 text-sm" /><input value={reportForm.sellerUrl} onChange={event => setReportForm({ ...reportForm, sellerUrl: event.target.value })} placeholder="Website (optional)" className="w-full glass-input rounded-xl px-4 py-3 text-sm" /><textarea value={reportForm.description} onChange={event => setReportForm({ ...reportForm, description: event.target.value })} placeholder="Describe what happened without sensitive information" className="w-full h-28 glass-input rounded-xl px-4 py-3 text-sm resize-none" /><p className="text-xs text-slate-500">This report stays in your browser and influences future local analyses.</p><div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setShowReport(false)}>Cancel</Button><Button variant="shield" onClick={addReport} disabled={!reportForm.sellerName.trim() || !reportForm.description.trim()}>Save report</Button></div></div></Modal>
    </div>
  );
}
