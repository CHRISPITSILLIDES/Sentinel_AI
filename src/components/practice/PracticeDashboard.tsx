import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Brain, Trophy, Target, Zap, Award, Star, BarChart3, RefreshCw, ArrowRight } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { ProgressRing } from '../ui/ProgressRing';
import { mockPracticeSession, mockPracticeTrades, mockAchievements, mockMarketData, mockPracticeSessions } from '../../stores/appStore';
import type { PracticeSession, PracticeTrade } from '../../stores/appStore';
import { subscribeToAppActions } from '../../lib/actions';
import { usePersistentState } from '../../lib/storage';

function SkillScoreRing({ score }: { score: number }) {
  return (
    <ProgressRing progress={score} size={100} strokeWidth={8} color="#eab308">
      <div className="text-center">
        <div className="text-2xl font-bold text-white">{score}</div>
        <div className="text-[9px] text-slate-400 uppercase tracking-wider">Skill</div>
      </div>
    </ProgressRing>
  );
}

function AchievementItem({ achievement }: { achievement: { title: string; description: string; achievementType: string; earnedAt: string } }) {
  const typeIcons: Record<string, React.ReactNode> = {
    first_trade: <Zap size={16} />,
    winning_streak: <Trophy size={16} />,
    risk_manager: <Target size={16} />,
    profit_target: <TrendingUp size={16} />,
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/90 border border-slate-700">
      <div className="p-2 rounded-lg bg-slate-900/80 text-slate-300">
        {typeIcons[achievement.achievementType] || <Award size={16} />}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{achievement.title}</p>
        <p className="text-xs text-slate-400">{achievement.description}</p>
      </div>
      <div className="text-xs text-slate-500">
        {new Date(achievement.earnedAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
      </div>
    </div>
  );
}

function PracticeTradeItem({ trade }: { trade: PracticeTrade }) {
  const isProfitable = trade.pnl !== undefined && trade.pnl > 0;

  return (
    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700 hover:bg-slate-900/90 transition-all">
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-lg ${trade.side === 'buy' ? 'bg-slate-900/80 text-slate-200' : 'bg-slate-900/80 text-slate-200'}`}>
          {trade.side === 'buy' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{trade.symbol}</span>
            <Badge variant={trade.side === 'buy' ? 'success' : 'danger'}>{trade.side.toUpperCase()}</Badge>
            <Badge variant={trade.status === 'open' ? 'info' : 'neutral'}>{trade.status}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
            <span>{trade.quantity} shares @ €{trade.entryPrice.toFixed(2)}</span>
            {trade.exitPrice && <span>→ €{trade.exitPrice.toFixed(2)}</span>}
            {trade.pnl !== undefined && (
              <span className="text-slate-200">
                {isProfitable ? '+' : ''}€{trade.pnl.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
      {trade.aiFeedback && (
        <div className="mt-2 text-xs text-slate-300 bg-slate-950/90 p-2.5 rounded-lg border border-slate-700">
          <Brain size={10} className="inline mr-1" />{trade.aiFeedback}
        </div>
      )}
    </div>
  );
}

export function PracticeDashboard() {
  const [sessions, setSessions] = usePersistentState<PracticeSession[]>('practice-sessions', mockPracticeSessions);
  const [currentSessionId, setCurrentSessionId] = usePersistentState<string>('practice-current-session', mockPracticeSessions[0]?.id || String(Date.now()));
  const [trades, setTrades] = usePersistentState<PracticeTrade[]>('practice-trades', mockPracticeTrades);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [tradeSide, setTradeSide] = useState<'buy' | 'sell'>('buy');
  const [tradeQuantity, setTradeQuantity] = useState('1');
  const [tradeError, setTradeError] = useState('');

  const session = sessions.find(s => s.id === currentSessionId) || sessions[0] || mockPracticeSession;
  const totalPnl = session.balance - session.initialBalance;
  const winRate = session.totalTrades > 0 ? ((session.winningTrades / session.totalTrades) * 100).toFixed(0) : '0';

  const executeTrade = () => {
    const marketItem = mockMarketData.find(m => m.symbol === selectedSymbol);
    if (!marketItem) return setTradeError('Choose a market symbol.');

    const qty = parseFloat(tradeQuantity);
    const price = marketItem.price;
    const cost = qty * price;

    if (!Number.isFinite(qty) || qty <= 0) return setTradeError('Enter a valid quantity.');
    if (tradeSide === 'buy' && cost > session.balance) return setTradeError('This virtual account does not have enough available cash.');

    const newTrade: PracticeTrade = {
      id: String(Date.now()),
      sessionId: session.id,
      symbol: selectedSymbol,
      side: tradeSide,
      quantity: qty,
      entryPrice: price,
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    setTrades(prev => [newTrade, ...prev]);

    if (tradeSide === 'buy') {
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, balance: s.balance - cost, totalTrades: s.totalTrades + 1 } : s));
    }

    setShowTradeModal(false);
    setTradeError('');
    setSelectedSymbol('');
    setTradeQuantity('1');
  };

  const closeTrade = (tradeId: string) => {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade || trade.status !== 'open') return;

    const marketItem = mockMarketData.find(m => m.symbol === trade.symbol);
    if (!marketItem) return;

    const exitPrice = marketItem.price;
    const pnl = trade.side === 'buy'
      ? (exitPrice - trade.entryPrice) * trade.quantity
      : (trade.entryPrice - exitPrice) * trade.quantity;

    const feedbacks = [
      pnl > 0
        ? `Good trade! You captured €${pnl.toFixed(2)} profit. Your entry timing was solid.`
        : `This trade lost €${Math.abs(pnl).toFixed(2)}. Consider using tighter stop-losses and waiting for clearer entry signals.`,
      pnl > 0 && pnl > trade.entryPrice * trade.quantity * 0.03
        ? `Excellent profit capture! Consider taking partial profits earlier to lock in gains while letting the rest run.`
        : pnl < 0 && Math.abs(pnl) > trade.entryPrice * trade.quantity * 0.03
        ? `Significant loss. In volatile conditions, consider reducing position size to manage risk better.`
        : `Decent risk management on this trade. Keep monitoring your position sizes relative to your total balance.`,
    ];

    setTrades(prev => prev.map(t =>
      t.id === tradeId ? {
        ...t,
        status: 'closed' as const,
        exitPrice,
        pnl,
        aiFeedback: feedbacks[pnl > 0 ? 0 : 1],
        closedAt: new Date().toISOString(),
      } : t
    ));

    setSessions(prev => prev.map(s => s.id === trade.sessionId ? {
      ...s,
      balance: s.balance + (trade.side === 'buy' ? trade.quantity * exitPrice : trade.quantity * (2 * trade.entryPrice - exitPrice)),
      winningTrades: s.winningTrades + (pnl > 0 ? 1 : 0),
      skillScore: Math.min(100, Math.max(0, s.skillScore + (pnl > 0 ? 3 : -2))),
    } : s));
  };

  const resetSession = () => {
    const newSession: PracticeSession = {
      id: String(Date.now()),
      balance: 10000,
      initialBalance: 10000,
      skillScore: 0,
      totalTrades: 0,
      winningTrades: 0,
      isActive: true,
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setTrades(prev => prev.filter(t => t.sessionId !== newSession.id));
  };

  useEffect(() => subscribeToAppActions(action => {
    if (action === 'practice_start') resetSession();
    if (action === 'practice_trade') setShowTradeModal(true);
    if (action === 'practice_score') document.getElementById('practice-score')?.scrollIntoView({ behavior: 'smooth' });
  }), []);

  const openTrades = trades.filter(t => t.status === 'open' && t.sessionId === session.id);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Practice</h1>
          <p className="text-sm text-slate-400 mt-0.5">Learning without loss</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-400">Account</label>
          <select value={currentSessionId} onChange={e => setCurrentSessionId(e.target.value)} className="glass-input rounded-xl px-3 py-2 text-sm bg-transparent">
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{`Acct ${s.id.slice(-4)} — €${s.balance.toLocaleString('de-DE', {minimumFractionDigits:2})}`}</option>
            ))}
          </select>
          <Button variant="ghost" size="sm" onClick={resetSession}>New Account</Button>
          <Button variant="practice" size="md" onClick={() => setShowTradeModal(true)}>
            <TrendingUp size={16} /> New Trade
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div id="practice-score" className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <GlassCard className="p-4 flex items-center gap-4" gradient>
          <SkillScoreRing score={session.skillScore} />
          <div>
            <div className="text-xs text-slate-300">Skill Score</div>
            <div className="text-sm text-white font-medium">{session.skillScore >= 70 ? 'Advanced' : session.skillScore >= 40 ? 'Intermediate' : 'Beginner'}</div>
          </div>
        </GlassCard>

        <GlassCard className="p-4" gradient>
          <div className="text-xs text-slate-300 mb-1">Virtual Balance</div>
          <div className="text-xl font-bold text-white">€{session.balance.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</div>
          <div className="text-xs text-slate-200">
            {totalPnl >= 0 ? '+' : ''}€{totalPnl.toFixed(2)}
          </div>
        </GlassCard>

        <GlassCard className="p-4" gradient>
          <div className="text-xs text-slate-300 mb-1">Total Trades</div>
          <div className="text-xl font-bold text-white">{session.totalTrades}</div>
          <div className="text-xs text-slate-400">{openTrades.length} open</div>
        </GlassCard>

        <GlassCard className="p-4" gradient>
          <div className="text-xs text-slate-300 mb-1">Win Rate</div>
          <div className="text-xl font-bold text-white">{winRate}%</div>
          <div className="text-xs text-slate-400">{session.winningTrades}/{session.totalTrades} wins</div>
        </GlassCard>

        <GlassCard className="p-4" gradient>
          <div className="text-xs text-slate-300 mb-1">Achievements</div>
          <div className="text-xl font-bold text-white">{mockAchievements.length}</div>
          <div className="text-xs text-slate-400">earned</div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Open Positions + Trade History */}
        <div className="lg:col-span-2 space-y-4">
          {openTrades.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-slate-400 mb-3">Open Positions</h2>
              <div className="space-y-2">
                {openTrades.map(trade => (
                  <div key={trade.id} className="p-3 rounded-xl bg-slate-950/90 border border-slate-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={trade.side === 'buy' ? 'success' : 'danger'}>{trade.side.toUpperCase()}</Badge>
                        <span className="text-sm font-semibold text-white">{trade.symbol}</span>
                        <span className="text-xs text-slate-400">{trade.quantity} @ €{trade.entryPrice.toFixed(2)}</span>
                      </div>
                      <Button variant="danger" size="sm" onClick={() => closeTrade(trade.id)}>
                        Close Position
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-sm font-medium text-slate-400 mb-3">Trade History</h2>
            <div className="space-y-2">
              {trades.filter(t => t.status === 'closed').slice(0, 8).map(trade => (
                <PracticeTradeItem key={trade.id} trade={trade} />
              ))}
              {trades.filter(t => t.status === 'closed').length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No closed trades yet. Start trading to see your history!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Achievements + Market */}
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-medium text-slate-400 mb-3">Achievements</h2>
            <div className="space-y-2">
              {mockAchievements.map(a => (
                <AchievementItem key={a.id} achievement={a} />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium text-slate-400 mb-1">Scenario Prices</h2>
            <p className="text-[11px] text-slate-500 mb-3">Fixed educational prices, not live market data.</p>
            <div className="space-y-1">
              {mockMarketData.slice(0, 6).map(m => (
                <button
                  key={m.symbol}
                  onClick={() => { setSelectedSymbol(m.symbol); setShowTradeModal(true); }}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-950/90 transition-all text-left"
                >
                  <div>
                    <div className="text-sm font-medium text-white">{m.symbol}</div>
                    <div className="text-xs text-slate-500">{m.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white">€{m.price.toFixed(2)}</div>
                    <div className="text-xs text-slate-200">
                      {m.change >= 0 ? '+' : ''}{m.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trade Modal */}
      <Modal isOpen={showTradeModal} onClose={() => setShowTradeModal(false)} title="Place Practice Trade">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Symbol</label>
            <select
              value={selectedSymbol}
              onChange={e => setSelectedSymbol(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white outline-none bg-transparent"
            >
              <option value="" className="bg-gray-900">Select symbol...</option>
              {mockMarketData.map(m => (
                <option key={m.symbol} value={m.symbol} className="bg-gray-900">
                  {m.symbol} — €{m.price.toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Side</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTradeSide('buy')}
                className={`p-2.5 rounded-lg text-sm font-medium transition-all border ${tradeSide === 'buy' ? 'bg-slate-900/80 border-slate-700 text-slate-200' : 'bg-slate-900/80 border-slate-700 text-slate-300'}`}
              >
                Buy
              </button>
              <button
                onClick={() => setTradeSide('sell')}
                className={`p-2.5 rounded-lg text-sm font-medium transition-all border ${tradeSide === 'sell' ? 'bg-slate-900/80 border-slate-700 text-slate-200' : 'bg-slate-900/80 border-slate-700 text-slate-300'}`}
              >
                Sell
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Quantity</label>
            <input
              type="number"
              value={tradeQuantity}
              onChange={e => setTradeQuantity(e.target.value)}
              min="0.01"
              step="0.01"
              className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none"
            />
          </div>
          {selectedSymbol && (
            <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-700">
              <div className="text-xs text-slate-400">Estimated Cost</div>
              <div className="text-lg font-bold text-white">
                €{(parseFloat(tradeQuantity) * (mockMarketData.find(m => m.symbol === selectedSymbol)?.price || 0)).toFixed(2)}
              </div>
              <div className="text-xs text-slate-500">Available: €{session.balance.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</div>
            </div>
          )}
          <div className="flex gap-3 justify-end">
            {tradeError && <p className="w-full text-xs text-red-300">{tradeError}</p>}
            <Button variant="ghost" onClick={() => { setShowTradeModal(false); setTradeError(''); }}>Cancel</Button>
            <Button variant="practice" onClick={executeTrade} disabled={!selectedSymbol || parseFloat(tradeQuantity) <= 0}>
              Place Trade
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
