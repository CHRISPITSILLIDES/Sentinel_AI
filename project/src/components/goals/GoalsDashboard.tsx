import { useState, useEffect } from 'react';
import { Target, Home, Plane, ShieldCheck, Laptop, Plus, ShoppingCart, Utensils, Car, Heart, GraduationCap, Lock, Gift } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { ProgressRing } from '../ui/ProgressRing';
import { mockGoals, mockCategoryLimits, mockFamilyGoals } from '../../stores/appStore';
import type { FamilyGoal, FamilyMember, Goal, CategoryLimit } from '../../stores/appStore';
import { piAPI } from '../../api/pi';

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

function GoalCard({ goal, onClick }: { goal: Goal; onClick: () => void }) {
  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  const remaining = goal.targetAmount - goal.currentAmount;
  const daysLeft = goal.deadline ? Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
  const monthlyNeeded = daysLeft && daysLeft > 0 ? remaining / (daysLeft / 30) : 0;

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
            <span>€{goal.currentAmount.toLocaleString('en-GB')} / €{goal.targetAmount.toLocaleString('en-GB')}</span>
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

const familyGoalIcons: Record<string, React.ReactNode> = {
  Home: <Home size={16} />,
  Plane: <Plane size={16} />,
  ShieldCheck: <ShieldCheck size={16} />,
  Laptop: <Laptop size={16} />,
  ShoppingCart: <ShoppingCart size={16} />,
  Utensils: <Utensils size={16} />,
  Car: <Car size={16} />,
  Heart: <Heart size={16} />,
  GraduationCap: <GraduationCap size={16} />,
  Gift: <Gift size={16} />,
  Target: <Target size={16} />,
};

export function GoalsDashboard({ currentMember }: { currentMember?: FamilyMember | null }) {
  const [goals, setGoals] = useState<Goal[]>(mockGoals);
  const [familyGoals, setFamilyGoals] = useState<FamilyGoal[]>(mockFamilyGoals);
  const [categoryLimits] = useState<CategoryLimit[]>(mockCategoryLimits);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddLimit, setShowAddLimit] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('other');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [newGoalScope, setNewGoalScope] = useState<'personal' | 'family'>('personal');
  const [newLimitCategory, setNewLimitCategory] = useState('entertainment');
  const [newLimitAmount, setNewLimitAmount] = useState('');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [investmentAllocation, setInvestmentAllocation] = useState(15);
  const [emergencyAllocation, setEmergencyAllocation] = useState(5);
  const [billsBuffer, setBillsBuffer] = useState(600);
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
      isShieldProtected: false,
      icon: 'Target',
      color: categoryColors[newGoalCategory] || '#94a3b8',
    };
    if (newGoalScope === 'family') {
      // only admins can create family goals
      if (currentMember && currentMember.role === 'admin') {
        const familyGoal: FamilyGoal = {
          id: String(Date.now()),
          name: newGoalName,
          targetAmount: amount,
          currentAmount: 0,
          managedBy: currentMember.name,
          contributions: [],
          icon: 'Target',
          color: categoryColors[newGoalCategory] || '#94a3b8',
        };
        setFamilyGoals(prev => [...prev, familyGoal]);
      } else {
        // non-admins creating family goals not allowed — fallback to personal
        setGoals(prev => [...prev, goal]);
      }
    } else {
      setGoals(prev => [...prev, goal]);
    }
    setShowAddGoal(false);
    setNewGoalName('');
    setNewGoalAmount('');
    setNewGoalDeadline('');
    setNewGoalScope('personal');
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

  useEffect(() => {
    if (!currentMember) return;
    piAPI.getGoals(currentMember.id)
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;

        const family = data.filter(item => item?.managedBy !== undefined);
        const personal = data.filter(item => item?.managedBy === undefined);

        if (family.length > 0) {
          setFamilyGoals(family as FamilyGoal[]);
        }
        if (personal.length > 0) {
          setGoals(personal as Goal[]);
        }
      })
      .catch(() => {
        // keep mockFamilyGoals on error
      });
  }, [currentMember]);

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

      {/* Family goals removed from dashboard — managed via New Goal modal by admins */}

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <GlassCard className="p-4" gradient>
          <div className="text-xs text-slate-300 mb-1">Total Saved</div>
          <div className="text-xl font-bold text-white">€{totalSaved.toLocaleString('en-GB')}</div>
          <div className="text-xs text-slate-400">of €{totalTargetAmount.toLocaleString('en-GB')}</div>
        </GlassCard>
        <GlassCard className="p-4" gradient>
          <div className="text-xs text-slate-300 mb-1">Active Goals</div>
          <div className="text-xl font-bold text-white">{goals.length}</div>
          <div className="text-xs text-slate-400">{goals.filter(g => g.currentAmount >= g.targetAmount).length} completed</div>
        </GlassCard>
        <GlassCard className="p-4" gradient>
          <div className="text-xs text-slate-300 mb-1">Shield Protected</div>
          <div className="text-xl font-bold text-white">€{protectedAmount.toLocaleString('en-GB')}</div>
          <div className="text-xs text-slate-400">auto-protected from spending</div>
        </GlassCard>
        <GlassCard className="p-4" gradient>
          <div className="text-xs text-slate-300 mb-1">Overall Progress</div>
          <div className="text-xl font-bold text-white">{totalTargetAmount > 0 ? ((totalSaved / totalTargetAmount) * 100).toFixed(0) : 0}%</div>
        </GlassCard>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Goals */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-medium text-slate-400 mb-3">Your Goals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {goals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onClick={() => setSelectedGoal(goal)}
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
                €{protectedAmount.toLocaleString('en-GB')} across {goals.filter(g => g.isShieldProtected).length} goals is currently shield-protected.
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
          {currentMember && currentMember.role === 'admin' ? (
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Scope</label>
              <select
                value={newGoalScope}
                onChange={e => setNewGoalScope(e.target.value as 'personal' | 'family')}
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white outline-none bg-transparent"
              >
                <option value="personal">Personal</option>
                <option value="family">Family (shared)</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Scope</label>
              <div className="text-sm text-slate-400">Personal</div>
            </div>
          )}
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
                €{selectedGoal.currentAmount.toLocaleString('en-GB')} / €{selectedGoal.targetAmount.toLocaleString('en-GB')}
              </div>
              <div className="text-sm text-slate-400">
                €{(selectedGoal.targetAmount - selectedGoal.currentAmount).toLocaleString('en-GB')} remaining
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
