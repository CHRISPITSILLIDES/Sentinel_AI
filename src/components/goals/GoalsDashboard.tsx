import { useState } from 'react';
import { Target, Home, Plane, ShieldCheck, Laptop, Plus, ShoppingCart, Utensils, Car, Heart, GraduationCap, Lock } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { ProgressRing } from '../ui/ProgressRing';
import { mockGoals, mockCategoryLimits } from '../../stores/appStore';
import type { Goal, CategoryLimit } from '../../stores/appStore';

const categoryIcons: Record<string, React.ReactNode> = {
  rent: <Home size={16} />,
  vacation: <Plane size={16} />,
  emergency: <ShieldCheck size={16} />,
  shopping: <Laptop size={16} />,
  entertainment: <ShoppingCart size={16} />,
  food: <Utensils size={16} />,
  transport: <Car size={16} />,
  health: <Heart size={16} />,
  education: <GraduationCap size={16} />,
  other: <Target size={16} />,
};

const categoryColors: Record<string, string> = {
  entertainment: '#f97316',
  food: '#10b981',
  shopping: '#8b5cf6',
  transport: '#3b82f6',
  health: '#ef4444',
  rent: '#0ea5e9',
  vacation: '#f59e0b',
  emergency: '#10b981',
  savings: '#06b6d4',
  education: '#8b5cf6',
  other: '#94a3b8',
};

function GoalCard({ goal, onClick, extraMonthly, totalRemaining }: { goal: Goal; onClick: () => void; extraMonthly: number; totalRemaining: number }) {
  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  const remaining = goal.targetAmount - goal.currentAmount;
  const daysLeft = goal.deadline ? Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
  const monthlyNeeded = daysLeft && daysLeft > 0 ? remaining / (daysLeft / 30) : 0;
  // allocate extra monthly across goals proportionally to remaining amounts
  const allocatedExtra = totalRemaining > 0 ? (extraMonthly * (remaining / totalRemaining)) : (extraMonthly > 0 ? extraMonthly : 0);
  const newMonthly = monthlyNeeded + allocatedExtra;
  const monthsToGoal = newMonthly > 0 ? (remaining / newMonthly) : null;
  const projectedDeadline = monthsToGoal !== null ? new Date(Date.now() + monthsToGoal * 30 * 24 * 60 * 60 * 1000) : null;

  return (
    <div
      onClick={onClick}
      className="bg-slate-950/90 rounded-2xl p-5 border border-slate-700 hover:border-slate-600 hover:bg-slate-900/90 hover:scale-[1.01] transition-all duration-300 cursor-pointer"
    >
      <div className="flex items-start gap-4">
        <ProgressRing
          progress={progress}
          size={64}
          strokeWidth={5}
          color={goal.color}
        >
          <span className="text-xs font-bold text-white">{Math.round(progress)}%</span>
        </ProgressRing>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white truncate">{goal.name}</h3>
            {goal.isShieldProtected && (
              <Badge variant="info"><Lock size={8} className="mr-1" />Protected</Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
            <span>€{goal.currentAmount.toLocaleString('de-DE')} / €{goal.targetAmount.toLocaleString('de-DE')}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium`} style={{ background: `${goal.color}20`, color: goal.color }}>
              {categoryIcons[goal.category] || <Target size={10} className="inline mr-1" />}
              {goal.category.charAt(0).toUpperCase() + goal.category.slice(1)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-slate-900/80 rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${goal.color}, ${goal.color}cc)` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">€{remaining.toLocaleString('de-DE')} remaining</span>
            {daysLeft !== null && (
              <span className={daysLeft < 7 ? 'text-slate-200' : 'text-slate-500'}>
                {daysLeft} days left
              </span>
            )}
          </div>

          {monthlyNeeded !== null && monthlyNeeded > 0 && (
            <div className="text-xs text-slate-500 mt-1">
              €{monthlyNeeded.toFixed(0)}/month needed
            </div>
          )}
          {extraMonthly > 0 && (
            <div className="text-xs text-slate-400 mt-1">
              <span className="text-slate-300">With </span>
              <span className="font-medium">€{Math.round(allocatedExtra)}</span>
              <span className="text-slate-300"> extra/month → </span>
              {monthsToGoal !== null ? (
                <span className="font-medium">in {Math.max(1, Math.round(monthsToGoal))} months</span>
              ) : (
                <span className="text-slate-400">no projection</span>
              )}
              {projectedDeadline && (
                <span className="text-slate-400"> &middot; by {projectedDeadline.toLocaleDateString('de-DE')}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryLimitCard({ limit }: { limit: CategoryLimit }) {
  const progress = (limit.currentSpent / limit.monthlyLimit) * 100;
  const remaining = limit.monthlyLimit - limit.currentSpent;
  const color = categoryColors[limit.category] || '#94a3b8';
  const isOverBudget = limit.currentSpent > limit.monthlyLimit;
  const isNearLimit = progress > 80;

  return (
    <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-700 hover:bg-slate-900/90 transition-all">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg" style={{ background: `${color}20`, color }}>
          {categoryIcons[limit.category] || <Target size={14} />}
        </div>
        <span className="text-sm font-medium text-white flex-1">{limit.category.charAt(0).toUpperCase() + limit.category.slice(1)}</span>
        {isOverBudget && <Badge variant="danger">Over!</Badge>}
        {isNearLimit && !isOverBudget && <Badge variant="warning">Near limit</Badge>}
      </div>

      <div className="h-1.5 bg-slate-900/80 rounded-full overflow-hidden mb-1.5">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(progress, 100)}%`,
            background: isOverBudget ? '#ef4444' : isNearLimit ? '#f59e0b' : color,
          }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">€{limit.currentSpent.toFixed(2)} / €{limit.monthlyLimit.toFixed(2)}</span>
        <span className={!isOverBudget ? 'text-slate-200' : 'text-rose-300'}>
          {isOverBudget ? `€${Math.abs(remaining).toFixed(2)} over` : `€${remaining.toFixed(2)} left`}
        </span>
      </div>
    </div>
  );
}

export function GoalsDashboard() {
  const [goals, setGoals] = useState<Goal[]>(mockGoals);
  const [categoryLimits] = useState<CategoryLimit[]>(mockCategoryLimits);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddLimit, setShowAddLimit] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('other');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [newGoalProtected, setNewGoalProtected] = useState(false);
  const [newLimitCategory, setNewLimitCategory] = useState('entertainment');
  const [newLimitAmount, setNewLimitAmount] = useState('');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [investmentAllocation, setInvestmentAllocation] = useState(15);
  const [emergencyAllocation, setEmergencyAllocation] = useState(5);
  const [billsBuffer, setBillsBuffer] = useState(600);
  const [extraMonthly, setExtraMonthly] = useState(50);

  const totalRemaining = goals.reduce((sum, g) => sum + Math.max(0, g.targetAmount - g.currentAmount), 0);

  const addGoal = () => {
    const amount = parseFloat(newGoalAmount);
    if (!newGoalName.trim() || !amount) return;
    const goal: Goal = {
      id: String(Date.now()),
      name: newGoalName,
      targetAmount: amount,
      currentAmount: 0,
      category: newGoalCategory,
      deadline: newGoalDeadline || undefined,
      isShieldProtected: newGoalProtected,
      icon: 'Target',
      color: categoryColors[newGoalCategory] || '#94a3b8',
    };
    setGoals(prev => [...prev, goal]);
    setShowAddGoal(false);
    setNewGoalName('');
    setNewGoalAmount('');
    setNewGoalDeadline('');
    setNewGoalProtected(false);
  };

  const contributeToGoal = (goalId: string, amount: number) => {
    setGoals(prev => prev.map(g =>
      g.id === goalId ? { ...g, currentAmount: Math.min(g.targetAmount, g.currentAmount + amount) } : g
    ));
    setSelectedGoal(null);
  };

  const totalTargetAmount = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const protectedAmount = goals.filter(g => g.isShieldProtected).reduce((sum, g) => sum + g.targetAmount - g.currentAmount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Goals</h1>
          <p className="text-sm text-slate-400 mt-0.5">Progress without spreadsheets</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowAddLimit(true)}>
            <ShoppingCart size={14} /> Set Limit
          </Button>
          <Button variant="primary" size="md" onClick={() => setShowAddGoal(true)}>
            <Plus size={16} /> New Goal
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <GlassCard className="p-4" gradient>
          <div className="text-xs text-slate-300 mb-1">Total Saved</div>
          <div className="text-xl font-bold text-white">€{totalSaved.toLocaleString('de-DE')}</div>
          <div className="text-xs text-slate-400">of €{totalTargetAmount.toLocaleString('de-DE')}</div>
        </GlassCard>
        <GlassCard className="p-4" gradient>
          <div className="text-xs text-slate-300 mb-1">Active Goals</div>
          <div className="text-xl font-bold text-white">{goals.length}</div>
          <div className="text-xs text-slate-400">{goals.filter(g => g.currentAmount >= g.targetAmount).length} completed</div>
        </GlassCard>
        <GlassCard className="p-4" gradient>
          <div className="text-xs text-slate-300 mb-1">Shield Protected</div>
          <div className="text-xl font-bold text-white">€{protectedAmount.toLocaleString('de-DE')}</div>
          <div className="text-xs text-slate-400">auto-protected from spending</div>
        </GlassCard>
        <GlassCard className="p-4" gradient>
          <div className="text-xs text-slate-300 mb-1">Overall Progress</div>
          <div className="text-xl font-bold text-white">{totalTargetAmount > 0 ? ((totalSaved / totalTargetAmount) * 100).toFixed(0) : 0}%</div>
        </GlassCard>
      </div>

      <GlassCard className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Pay Yourself First</h2>
            <p className="text-sm text-slate-400 mt-1">Automatically shield money on payday before it reaches your spending account.</p>
          </div>
          <Button
            variant={autoSaveEnabled ? 'goals' : 'secondary'}
            size="sm"
            onClick={() => setAutoSaveEnabled(prev => !prev)}
          >
            {autoSaveEnabled ? 'Enabled' : 'Disabled'}
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-slate-950/90 p-4 border border-slate-700">
            <div className="text-xs text-slate-400 mb-2">Investments</div>
            <div className="text-2xl font-bold text-slate-200">{investmentAllocation}%</div>
            <div className="text-xs text-slate-500 mt-2">of each paycheck is moved to investments before spending.</div>
          </div>
          <div className="rounded-2xl bg-slate-950/90 p-4 border border-slate-700">
            <div className="text-xs text-slate-400 mb-2">Emergency Fund</div>
            <div className="text-2xl font-bold text-slate-200">{emergencyAllocation}%</div>
            <div className="text-xs text-slate-500 mt-2">is added to your emergency savings automatically.</div>
          </div>
          <div className="rounded-2xl bg-slate-950/90 p-4 border border-slate-700">
            <div className="text-xs text-slate-400 mb-2">Bills Account</div>
            <div className="text-2xl font-bold text-slate-200">€{billsBuffer}</div>
            <div className="text-xs text-slate-500 mt-2">kept aside for recurring bills so you never overspend it.</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs text-slate-400">Investments %</label>
            <span className="text-sm text-white">{investmentAllocation}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={20}
            step={1}
            value={investmentAllocation}
            onChange={e => setInvestmentAllocation(Number(e.target.value))}
            className="w-full mt-2"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400">Emergency contribution</label>
            <input
              type="number"
              value={emergencyAllocation}
              min={0}
              max={15}
              onChange={e => setEmergencyAllocation(Number(e.target.value))}
              className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Bills buffer</label>
            <input
              type="number"
              value={billsBuffer}
              min={0}
              onChange={e => setBillsBuffer(Number(e.target.value))}
              className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none"
            />
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          If you never see the money in your spending account, you rarely miss it. Pay yourself first by moving cash to investments, emergency savings and a bills account on payday.
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Goals */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-medium text-slate-400 mb-3">Your Goals</h2>
          <div className="mb-3 flex items-center gap-3">
            <label className="text-xs text-slate-400">What if I saved</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={500}
                step={10}
                value={extraMonthly}
                onChange={e => setExtraMonthly(Number(e.target.value))}
                className="w-56"
              />
              <div className="text-sm font-medium text-white">€{extraMonthly}/month</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {goals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onClick={() => setSelectedGoal(goal)}
                extraMonthly={extraMonthly}
                totalRemaining={totalRemaining}
              />
            ))}
          </div>
        </div>

        {/* Category Limits */}
        <div>
          <h2 className="text-sm font-medium text-slate-400 mb-3">Spending Limits</h2>
          <div className="space-y-2">
            {categoryLimits.map(limit => (
              <CategoryLimitCard key={limit.id} limit={limit} />
            ))}
          </div>

          {/* Shield Integration */}
          <GlassCard className="p-4 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={18} className="text-slate-300" />
              <h3 className="text-sm font-medium text-white">Shield Integration</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Goals marked as "Shield Protected" are automatically defended. No transaction is approved if it would breach the protected amount. Your past self protects your future self.
            </p>
            <div className="mt-3 p-2 rounded-lg bg-slate-900/80 border border-slate-700">
              <div className="text-xs text-slate-300">
                €{protectedAmount.toLocaleString('de-DE')} across {goals.filter(g => g.isShieldProtected).length} goals is currently shield-protected.
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Add Goal Modal */}
      <Modal isOpen={showAddGoal} onClose={() => setShowAddGoal(false)} title="Create New Goal">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Goal Name</label>
            <input
              type="text"
              value={newGoalName}
              onChange={e => setNewGoalName(e.target.value)}
              placeholder="e.g., Save for vacation"
              className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Target Amount (EUR)</label>
            <input
              type="number"
              value={newGoalAmount}
              onChange={e => setNewGoalAmount(e.target.value)}
              placeholder="e.g., 1000"
              className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Category</label>
            <select
              value={newGoalCategory}
              onChange={e => setNewGoalCategory(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white outline-none bg-transparent"
            >
              {Object.keys(categoryIcons).map(cat => (
                <option key={cat} value={cat} className="bg-gray-900">{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Deadline (optional)</label>
            <input
              type="date"
              value={newGoalDeadline}
              onChange={e => setNewGoalDeadline(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white outline-none"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              onClick={() => setNewGoalProtected(!newGoalProtected)}
              className={`w-10 h-5 rounded-full transition-all duration-200 ${newGoalProtected ? 'bg-slate-700' : 'bg-slate-800/80'} relative`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 ${newGoalProtected ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
            <div>
              <span className="text-sm text-white">Shield Protect this goal</span>
              <p className="text-xs text-slate-400">Transactions that would breach this goal will be blocked</p>
            </div>
          </label>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowAddGoal(false)}>Cancel</Button>
            <Button variant="goals" onClick={addGoal}>Create Goal</Button>
          </div>
        </div>
      </Modal>

      {/* Add Category Limit Modal */}
      <Modal isOpen={showAddLimit} onClose={() => setShowAddLimit(false)} title="Set Spending Limit">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Category</label>
            <select
              value={newLimitCategory}
              onChange={e => setNewLimitCategory(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white outline-none bg-transparent"
            >
              {['entertainment', 'food', 'shopping', 'transport', 'health', 'education'].map(cat => (
                <option key={cat} value={cat} className="bg-gray-900">{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Monthly Limit (EUR)</label>
            <input
              type="number"
              value={newLimitAmount}
              onChange={e => setNewLimitAmount(e.target.value)}
              placeholder="e.g., 200"
              className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowAddLimit(false)}>Cancel</Button>
            <Button variant="goals" onClick={() => setShowAddLimit(false)}>Set Limit</Button>
          </div>
        </div>
      </Modal>

      {/* Goal Detail Modal */}
      <Modal isOpen={!!selectedGoal} onClose={() => setSelectedGoal(null)} title={selectedGoal?.name || 'Goal'}>
        {selectedGoal && (
          <div className="space-y-4">
            <div className="flex items-center justify-center mb-4">
              <ProgressRing
                progress={(selectedGoal.currentAmount / selectedGoal.targetAmount) * 100}
                size={120}
                strokeWidth={8}
                color={selectedGoal.color}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{Math.round((selectedGoal.currentAmount / selectedGoal.targetAmount) * 100)}%</div>
                  <div className="text-[10px] text-slate-400">complete</div>
                </div>
              </ProgressRing>
            </div>

            <div className="text-center">
              <div className="text-lg font-bold text-white">
                €{selectedGoal.currentAmount.toLocaleString('de-DE')} / €{selectedGoal.targetAmount.toLocaleString('de-DE')}
              </div>
              <div className="text-sm text-slate-400">
                €{(selectedGoal.targetAmount - selectedGoal.currentAmount).toLocaleString('de-DE')} remaining
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[25, 50, 100].map(amount => (
                <Button
                  key={amount}
                  variant="secondary"
                  onClick={() => contributeToGoal(selectedGoal.id, amount)}
                  disabled={selectedGoal.currentAmount >= selectedGoal.targetAmount}
                >
                  +€{amount}
                </Button>
              ))}
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Custom Amount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Amount"
                  className="flex-1 glass-input rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 outline-none"
                />
                <Button variant="goals" size="sm">Add</Button>
              </div>
            </div>

            {selectedGoal.isShieldProtected && (
              <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-700">
                <div className="flex items-center gap-2 text-slate-200">
                  <Lock size={14} />
                  <span className="text-xs font-medium">Shield Protected</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">This goal's remaining amount is automatically protected from transactions.</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
