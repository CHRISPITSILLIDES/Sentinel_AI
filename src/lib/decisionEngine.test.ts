import { describe, expect, it } from 'vitest';
import { analyzeDecision, validateDecisionInput } from './decisionEngine';
import { mockCategoryLimits, mockGoals, mockScamReports, mockShieldRules } from '../stores/appStore';

const context = { rules: mockShieldRules, reports: mockScamReports, goals: mockGoals, categoryLimits: mockCategoryLimits };

describe('decision engine', () => {
  it('approves a small ordinary purchase without warning signals', () => {
    const result = analyzeDecision({ sellerName: 'Local Bakery', amount: 8, category: 'food', cardId: '2', cardBalance: 1800 }, context);
    expect(result.action).toBe('approve');
    expect(result.score).toBeLessThan(25);
  });

  it('blocks a reported seller with urgent irreversible payment language', () => {
    const result = analyzeDecision({
      sellerName: 'SuperDealz-Shop.xyz', sellerUrl: 'https://superdealz-shop.xyz', amount: 480, category: 'shopping', cardId: '1', cardBalance: 4250,
      content: 'URGENT: send money by crypto immediately or your account will be locked.',
    }, context);
    expect(result.action).toBe('block');
    expect(result.level).toBe('critical');
    expect(result.evidence.map(item => item.id)).toContain('community-report');
    expect(result.evidence.map(item => item.id)).toContain('unsafe-payment');
  });

  it('triggers category and spending limits', () => {
    const result = analyzeDecision({ sellerName: 'Shop', amount: 100, category: 'shopping', cardId: '1', cardBalance: 4250 }, context);
    expect(result.triggeredRuleIds).toContain('1');
    expect(result.evidence.map(item => item.id)).toContain('category-limit');
  });

  it('calculates impact on active goals', () => {
    const result = analyzeDecision({ sellerName: 'Airline', amount: 500, category: 'travel', cardId: '2', cardBalance: 1800 }, context);
    expect(result.goalImpact).toHaveLength(4);
    expect(result.goalImpact.some(goal => goal.protected && goal.estimatedDelayDays > 0)).toBe(true);
  });

  it('validates incomplete transaction data', () => {
    const errors = validateDecisionInput({ sellerName: '', amount: 0, category: '', cardId: '1', cardBalance: 100 });
    expect(errors.sellerName).toBeTruthy();
    expect(errors.amount).toBeTruthy();
    expect(errors.category).toBeTruthy();
  });
});
