import type { CategoryLimit, Goal, ScamReport, ShieldRule } from '../stores/appStore';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RecommendedAction = 'approve' | 'review' | 'block';

export interface DecisionInput {
  sellerName: string;
  sellerUrl?: string;
  content?: string;
  amount: number;
  category: string;
  cardId: string;
  cardBalance: number;
  occurredAt?: string;
}

export interface Evidence {
  id: string;
  label: string;
  detail: string;
  points: number;
  severity: 'info' | 'warning' | 'danger';
}

export interface GoalImpact {
  goalId: string;
  goalName: string;
  protected: boolean;
  currentAmount: number;
  remainingBefore: number;
  additionalMonthlyNeeded: number;
  estimatedDelayDays: number;
}

export interface DecisionResult {
  id: string;
  createdAt: string;
  input: DecisionInput;
  score: number;
  level: RiskLevel;
  action: RecommendedAction;
  summary: string;
  evidence: Evidence[];
  triggeredRuleIds: string[];
  goalImpact: GoalImpact[];
}

export interface DecisionContext {
  rules: ShieldRule[];
  reports: ScamReport[];
  goals: Goal[];
  categoryLimits: CategoryLimit[];
}

const suspiciousTlds = ['zip', 'mov', 'xyz', 'top', 'click', 'loan', 'work', 'gq', 'tk'];
const urgencyPatterns = [
  /urgent/i,
  /act now/i,
  /immediately/i,
  /within \d+ (?:minutes?|hours?)/i,
  /account (?:will be )?(?:closed|locked|suspended)/i,
  /final warning/i,
];
const paymentPatterns = [
  /gift card/i,
  /crypto(?:currency)?/i,
  /bitcoin/i,
  /wire transfer/i,
  /send money/i,
  /authentication code/i,
  /one[- ]time (?:code|password)/i,
  /remote access/i,
];

function normalizeHost(value?: string) {
  if (!value) return '';
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return value.toLowerCase().replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
  }
}

function daysUntil(deadline?: string) {
  if (!deadline) return 0;
  return Math.max(1, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000));
}

function addEvidence(evidence: Evidence[], item: Evidence) {
  if (!evidence.some(existing => existing.id === item.id)) evidence.push(item);
}

export function validateDecisionInput(input: DecisionInput) {
  const errors: Partial<Record<keyof DecisionInput, string>> = {};
  if (!input.sellerName.trim()) errors.sellerName = 'Enter a seller or sender name.';
  if (!Number.isFinite(input.amount) || input.amount <= 0) errors.amount = 'Enter an amount greater than zero.';
  if (!input.category.trim()) errors.category = 'Choose a transaction category.';
  if (input.sellerUrl && !normalizeHost(input.sellerUrl)) errors.sellerUrl = 'Enter a valid website or leave it empty.';
  return errors;
}

export function analyzeDecision(input: DecisionInput, context: DecisionContext): DecisionResult {
  const evidence: Evidence[] = [];
  const triggeredRuleIds: string[] = [];
  const combinedText = `${input.sellerName} ${input.sellerUrl || ''} ${input.content || ''}`;
  const host = normalizeHost(input.sellerUrl);

  const report = context.reports.find(item => {
    const reportHost = normalizeHost(item.sellerUrl);
    return item.sellerName.toLowerCase() === input.sellerName.toLowerCase() || Boolean(host && reportHost && host === reportHost);
  });
  if (report) addEvidence(evidence, {
    id: 'community-report',
    label: 'Previously reported seller',
    detail: `${report.reportCount} local/community report${report.reportCount === 1 ? '' : 's'} match this seller.`,
    points: Math.min(45, 20 + Math.round(report.reportCount / 5)),
    severity: 'danger',
  });

  if (host) {
    const tld = host.split('.').pop() || '';
    if (suspiciousTlds.includes(tld)) addEvidence(evidence, {
      id: 'risky-tld', label: 'Higher-risk domain ending', detail: `The .${tld} ending is frequently abused in disposable scam campaigns.`, points: 18, severity: 'warning',
    });
    if (/[^a-z0-9.-]/i.test(host) || (host.match(/-/g) || []).length >= 2) addEvidence(evidence, {
      id: 'lookalike-domain', label: 'Unusual domain structure', detail: 'The website contains characters or separators commonly used in lookalike domains.', points: 16, severity: 'warning',
    });
  }

  const urgencyHits = urgencyPatterns.filter(pattern => pattern.test(combinedText));
  if (urgencyHits.length) addEvidence(evidence, {
    id: 'urgency', label: 'Pressure or urgency language', detail: 'The message tries to shorten the time available for independent verification.', points: Math.min(24, 12 + urgencyHits.length * 4), severity: 'warning',
  });
  const paymentHits = paymentPatterns.filter(pattern => pattern.test(combinedText));
  if (paymentHits.length) addEvidence(evidence, {
    id: 'unsafe-payment', label: 'High-risk payment or access request', detail: 'The request mentions irreversible payment, authentication secrets, or remote access.', points: Math.min(35, 20 + paymentHits.length * 5), severity: 'danger',
  });

  if (input.amount > input.cardBalance) addEvidence(evidence, {
    id: 'insufficient-balance', label: 'Insufficient available balance', detail: 'The amount exceeds the selected card balance.', points: 40, severity: 'danger',
  });
  else if (input.amount >= input.cardBalance * 0.25) addEvidence(evidence, {
    id: 'large-balance-share', label: 'Large share of available balance', detail: `This payment uses ${Math.round((input.amount / input.cardBalance) * 100)}% of the selected balance.`, points: 14, severity: 'warning',
  });

  const categoryLimit = context.categoryLimits.find(limit => limit.isActive && limit.category === input.category);
  if (categoryLimit && categoryLimit.currentSpent + input.amount > categoryLimit.monthlyLimit) addEvidence(evidence, {
    id: 'category-limit', label: 'Spending limit exceeded', detail: `This would put ${input.category} spending at EUR ${(categoryLimit.currentSpent + input.amount).toFixed(2)} against a EUR ${categoryLimit.monthlyLimit.toFixed(2)} limit.`, points: 20, severity: 'warning',
  });

  for (const rule of context.rules.filter(rule => rule.isActive && rule.cardId === input.cardId)) {
    if (rule.ruleType === 'spending_limit') {
      const limit = Number(rule.parameters.limit) || Number(rule.ruleText.match(/(?:over|above)\s+(\d+(?:\.\d+)?)/i)?.[1]);
      if (limit && input.amount > limit) {
        triggeredRuleIds.push(rule.id);
        addEvidence(evidence, { id: `rule-${rule.id}`, label: 'Card spending rule triggered', detail: rule.ruleText, points: 18, severity: 'warning' });
      }
    }
    if (rule.ruleType === 'category_block' && String(rule.parameters.category || '').toLowerCase() === input.category.toLowerCase()) {
      triggeredRuleIds.push(rule.id);
      addEvidence(evidence, { id: `rule-${rule.id}`, label: 'Blocked category rule triggered', detail: rule.ruleText, points: 45, severity: 'danger' });
    }
    if (rule.ruleType === 'seller_verification' && !report && (host || input.sellerUrl)) {
      triggeredRuleIds.push(rule.id);
      addEvidence(evidence, { id: `rule-${rule.id}`, label: 'Seller verification required', detail: rule.ruleText, points: 12, severity: 'warning' });
    }
    if (rule.ruleType === 'time_restriction') {
      const afterHour = Number(rule.parameters.afterHour);
      const hour = new Date(input.occurredAt || Date.now()).getHours();
      if (Number.isFinite(afterHour) && hour >= afterHour) {
        triggeredRuleIds.push(rule.id);
        addEvidence(evidence, { id: `rule-${rule.id}`, label: 'Time restriction triggered', detail: rule.ruleText, points: 20, severity: 'warning' });
      }
    }
  }

  const goalImpact = context.goals
    .filter(goal => goal.currentAmount < goal.targetAmount)
    .map(goal => {
      const remaining = goal.targetAmount - goal.currentAmount;
      const days = daysUntil(goal.deadline);
      const months = days ? Math.max(days / 30, 1) : 6;
      const share = Math.min(input.amount, remaining);
      return {
        goalId: goal.id,
        goalName: goal.name,
        protected: goal.isShieldProtected,
        currentAmount: goal.currentAmount,
        remainingBefore: remaining,
        additionalMonthlyNeeded: share / months,
        estimatedDelayDays: Math.max(1, Math.round((share / Math.max(goal.currentAmount / Math.max(months, 1), 50)) * 30)),
      };
    });

  const protectedConflict = goalImpact.some(goal => goal.protected && input.amount > Math.max(50, goal.remainingBefore * 0.15));
  if (protectedConflict) addEvidence(evidence, {
    id: 'protected-goal', label: 'Protected goal conflict', detail: 'The payment is large enough to materially delay at least one Shield-protected goal.', points: 22, severity: 'warning',
  });

  const score = Math.min(100, evidence.reduce((total, item) => total + item.points, 0));
  const level: RiskLevel = score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';
  const action: RecommendedAction = score >= 50 || evidence.some(item => item.id === 'insufficient-balance') ? 'block' : score >= 25 ? 'review' : 'approve';
  const summary = action === 'block'
    ? 'Stop and verify this payment through an independent official channel before proceeding.'
    : action === 'review'
      ? 'Pause for a second check. The payment has warning signs or conflicts with your rules and goals.'
      : 'No strong warning signals were found by the local rules engine.';

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    input,
    score,
    level,
    action,
    summary,
    evidence: evidence.sort((a, b) => b.points - a.points),
    triggeredRuleIds,
    goalImpact,
  };
}
