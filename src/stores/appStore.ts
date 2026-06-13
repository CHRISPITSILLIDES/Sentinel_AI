// Types and mock data for the NataCONNECT demo

export type Pillar = 'shield' | 'practice' | 'guide' | 'goals' | 'account';

export interface Card {
  id: string;
  name: string;
  cardType: 'debit' | 'credit';
  lastFour: string;
  brand: string;
  balance: number;
  currency: string;
  color: string;
  isActive: boolean;
}

export interface ShieldRule {
  id: string;
  cardId: string;
  ruleText: string;
  ruleType: 'spending_limit' | 'time_restriction' | 'seller_verification' | 'category_block' | 'custom';
  isActive: boolean;
  parameters: Record<string, unknown>;
}

export interface Transaction {
  id: string;
  cardId: string;
  sellerName: string;
  sellerUrl?: string;
  amount: number;
  currency: string;
  category: string;
  status: 'pending' | 'approved' | 'blocked' | 'flagged';
  blockReason?: string;
  ruleId?: string;
  isScamReport: boolean;
  createdAt: string;
}

export interface ScamReport {
  id: string;
  sellerName: string;
  sellerUrl?: string;
  description: string;
  reportType: string;
  verified: boolean;
  reportCount: number;
  createdAt: string;
}

export interface Portfolio {
  id: string;
  name: string;
  initialCapital: number;
  currentValue: number;
  maxLoss: number;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  status: 'active' | 'paused' | 'stopped';
}

export interface Trade {
  id: string;
  portfolioId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  pnl?: number;
  status: 'open' | 'closed' | 'rejected';
  aiReasoning?: string;
  createdAt: string;
}

export interface PracticeSession {
  id: string;
  balance: number;
  initialBalance: number;
  skillScore: number;
  totalTrades: number;
  winningTrades: number;
  isActive: boolean;
}

export interface PracticeTrade {
  id: string;
  sessionId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  pnl?: number;
  status: 'open' | 'closed';
  aiFeedback?: string;
  createdAt: string;
}

export interface Achievement {
  id: string;
  achievementType: string;
  title: string;
  description: string;
  earnedAt: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  category: string;
  deadline?: string;
  isShieldProtected: boolean;
  icon: string;
  color: string;
}

export interface CategoryLimit {
  id: string;
  category: string;
  monthlyLimit: number;
  currentSpent: number;
  isActive: boolean;
}

// Mock data
export const mockCards: Card[] = [
  { id: '1', name: 'Main Debit', cardType: 'debit', lastFour: '4821', brand: 'Visa', balance: 4250.80, currency: 'EUR', color: '#3b82f6', isActive: true },
  { id: '2', name: 'Travel Credit', cardType: 'credit', lastFour: '7392', brand: 'Mastercard', balance: 1800.00, currency: 'EUR', color: '#f97316', isActive: true },
  { id: '3', name: 'Savings', cardType: 'debit', lastFour: '1056', brand: 'Visa', balance: 8750.00, currency: 'EUR', color: '#10b981', isActive: true },
];

export const mockShieldRules: ShieldRule[] = [
  { id: '1', cardId: '1', ruleText: 'Ask me before any purchase over 50 EUR', ruleType: 'spending_limit', isActive: true, parameters: { limit: 50 } },
  { id: '2', cardId: '1', ruleText: 'Block unverified sellers', ruleType: 'seller_verification', isActive: true, parameters: {} },
  { id: '3', cardId: '2', ruleText: 'No online shopping after 11 PM', ruleType: 'time_restriction', isActive: true, parameters: { afterHour: 23 } },
  { id: '4', cardId: '1', ruleText: 'Block gambling transactions', ruleType: 'category_block', isActive: true, parameters: { category: 'gambling' } },
];

export const mockTransactions: Transaction[] = [
  { id: '1', cardId: '1', sellerName: 'Netflix', amount: 15.99, currency: 'EUR', category: 'entertainment', status: 'approved', isScamReport: false, createdAt: '2026-06-13T10:30:00Z' },
  { id: '2', cardId: '1', sellerName: 'SuperDealz-Shop.xyz', sellerUrl: 'https://superdealz-shop.xyz', amount: 89.99, currency: 'EUR', category: 'shopping', status: 'blocked', blockReason: 'Seller flagged by 47 community reports. Rule: "Block unverified sellers" triggered.', isScamReport: true, createdAt: '2026-06-13T09:15:00Z' },
  { id: '3', cardId: '1', sellerName: 'LuckyWin Casino', amount: 200.00, currency: 'EUR', category: 'gambling', status: 'blocked', blockReason: 'Category "gambling" is blocked by your rules.', isScamReport: false, createdAt: '2026-06-12T22:45:00Z' },
  { id: '4', cardId: '2', sellerName: 'Amazon', amount: 34.50, currency: 'EUR', category: 'shopping', status: 'approved', isScamReport: false, createdAt: '2026-06-12T15:20:00Z' },
  { id: '5', cardId: '1', sellerName: 'FakeApple-Store.com', sellerUrl: 'https://fakeapple-store.com', amount: 599.00, currency: 'EUR', category: 'electronics', status: 'blocked', blockReason: 'Known phishing site. 128 community reports. Purchase blocked.', isScamReport: true, createdAt: '2026-06-12T11:05:00Z' },
  { id: '6', cardId: '1', sellerName: 'Uber Eats', amount: 22.40, currency: 'EUR', category: 'food', status: 'approved', isScamReport: false, createdAt: '2026-06-11T19:30:00Z' },
];

export const mockScamReports: ScamReport[] = [
  { id: '1', sellerName: 'SuperDealz-Shop.xyz', sellerUrl: 'https://superdealz-shop.xyz', description: 'Fake electronics store. Products never shipped.', reportType: 'fraud', verified: false, reportCount: 47, createdAt: '2026-06-10T08:00:00Z' },
  { id: '2', sellerName: 'FakeApple-Store.com', sellerUrl: 'https://fakeapple-store.com', description: 'Phishing site mimicking Apple Store. Steals payment info.', reportType: 'phishing', verified: false, reportCount: 128, createdAt: '2026-06-08T14:00:00Z' },
  { id: '3', sellerName: 'CheapLuxury-Bags.net', description: 'Counterfeit goods sold as authentic.', reportType: 'fake_product', verified: false, reportCount: 23, createdAt: '2026-06-05T12:00:00Z' },
];

export const mockPortfolio: Portfolio = {
  id: '1',
  name: 'Main Portfolio',
  initialCapital: 100.00,
  currentValue: 123.47,
  maxLoss: 20.00,
  riskProfile: 'conservative',
  status: 'active',
};

export const mockTrades: Trade[] = [
  { id: '1', portfolioId: '1', symbol: 'AAPL', side: 'buy', quantity: 0.15, entryPrice: 195.20, exitPrice: 198.80, pnl: 0.54, status: 'closed', aiReasoning: 'Strong momentum after earnings beat. Risk/reward favorable within loss limits.', createdAt: '2026-06-12T10:00:00Z' },
  { id: '2', portfolioId: '1', symbol: 'MSFT', side: 'buy', quantity: 0.08, entryPrice: 415.50, exitPrice: 420.10, pnl: 0.37, status: 'closed', aiReasoning: 'Cloud revenue growth accelerating. Entry near support level.', createdAt: '2026-06-12T11:30:00Z' },
  { id: '3', portfolioId: '1', symbol: 'TSLA', side: 'buy', quantity: 0.05, entryPrice: 178.90, status: 'open', aiReasoning: 'Breakout above 50-day MA. Stop loss set at 172.50 to stay within max loss.', createdAt: '2026-06-13T09:00:00Z' },
  { id: '4', portfolioId: '1', symbol: 'NVDA', side: 'buy', quantity: 0.02, entryPrice: 890.00, status: 'rejected', aiReasoning: 'Position size would breach max loss limit if stop hit. Trade rejected to protect capital.', createdAt: '2026-06-13T08:45:00Z' },
  { id: '5', portfolioId: '1', symbol: 'GOOGL', side: 'buy', quantity: 0.12, entryPrice: 172.30, exitPrice: 175.60, pnl: 0.40, status: 'closed', aiReasoning: 'AI sector rotation favoring GOOGL. Quick scalp within boundaries.', createdAt: '2026-06-11T14:00:00Z' },
];

export const mockPracticeSession: PracticeSession = {
  id: '1',
  balance: 10450.00,
  initialBalance: 10000.00,
  skillScore: 72,
  totalTrades: 34,
  winningTrades: 22,
  isActive: true,
};

export const mockPracticeTrades: PracticeTrade[] = [
  { id: '1', sessionId: '1', symbol: 'AAPL', side: 'buy', quantity: 2, entryPrice: 195.20, exitPrice: 198.80, pnl: 7.20, status: 'closed', aiFeedback: 'Good entry point. Your timing on this trade was excellent. The risk management was appropriate for your stated boundaries.', createdAt: '2026-06-13T10:00:00Z' },
  { id: '2', sessionId: '1', symbol: 'TSLA', side: 'buy', quantity: 3, entryPrice: 180.50, exitPrice: 176.20, pnl: -12.90, status: 'closed', aiFeedback: 'You sold twelve minutes before the price recovered. In volatile conditions, consider setting wider stop-losses to avoid premature exits.', createdAt: '2026-06-12T15:30:00Z' },
  { id: '3', sessionId: '1', symbol: 'NVDA', side: 'buy', quantity: 1, entryPrice: 885.00, status: 'open', aiFeedback: undefined, createdAt: '2026-06-13T11:00:00Z' },
];

export const mockPracticeSessions: PracticeSession[] = [
  { id: '1', balance: 10450.00, initialBalance: 10000.00, skillScore: 72, totalTrades: 34, winningTrades: 22, isActive: true },
  { id: '2', balance: 5000.00, initialBalance: 5000.00, skillScore: 45, totalTrades: 12, winningTrades: 6, isActive: true },
  { id: '3', balance: 25000.00, initialBalance: 20000.00, skillScore: 85, totalTrades: 78, winningTrades: 56, isActive: true },
];

export const mockAchievements: Achievement[] = [
  { id: '1', achievementType: 'first_trade', title: 'First Steps', description: 'Completed your first practice trade', earnedAt: '2026-06-10T10:00:00Z' },
  { id: '2', achievementType: 'winning_streak', title: 'Hot Streak', description: '5 winning trades in a row', earnedAt: '2026-06-11T16:00:00Z' },
  { id: '3', achievementType: 'risk_manager', title: 'Risk Manager', description: 'Never exceeded 2% risk per trade for 10 trades', earnedAt: '2026-06-12T12:00:00Z' },
  { id: '4', achievementType: 'profit_target', title: '4% Profit', description: 'Achieved 4% total portfolio profit', earnedAt: '2026-06-13T09:00:00Z' },
];

export const mockGoals: Goal[] = [
  { id: '1', name: 'Rent Buffer', targetAmount: 1200, currentAmount: 1152, category: 'rent', deadline: '2026-07-01', isShieldProtected: true, icon: 'Home', color: '#3b82f6' },
  { id: '2', name: 'Summer Vacation', targetAmount: 1500, currentAmount: 875, category: 'vacation', deadline: '2026-08-15', isShieldProtected: false, icon: 'Plane', color: '#f97316' },
  { id: '3', name: 'Emergency Fund', targetAmount: 5000, currentAmount: 3200, category: 'emergency', isShieldProtected: true, icon: 'ShieldCheck', color: '#10b981' },
  { id: '4', name: 'New Laptop', targetAmount: 1200, currentAmount: 680, category: 'shopping', deadline: '2026-09-01', isShieldProtected: false, icon: 'Laptop', color: '#8b5cf6' },
];

export const mockCategoryLimits: CategoryLimit[] = [
  { id: '1', category: 'entertainment', monthlyLimit: 100, currentSpent: 67.40, isActive: true },
  { id: '2', category: 'food', monthlyLimit: 400, currentSpent: 245.80, isActive: true },
  { id: '3', category: 'shopping', monthlyLimit: 250, currentSpent: 189.99, isActive: true },
  { id: '4', category: 'transport', monthlyLimit: 150, currentSpent: 89.50, isActive: true },
  { id: '5', category: 'health', monthlyLimit: 200, currentSpent: 45.00, isActive: true },
];

export const mockPortfolioHistory = [
  { time: '10:00', value: 100.00 },
  { time: '10:30', value: 100.54 },
  { time: '11:00', value: 100.37 },
  { time: '11:30', value: 100.91 },
  { time: '12:00', value: 101.10 },
  { time: '12:30', value: 101.48 },
  { time: '13:00', value: 102.05 },
  { time: '13:30', value: 102.85 },
  { time: '14:00', value: 103.25 },
  { time: '14:30', value: 103.80 },
  { time: '15:00', value: 104.50 },
  { time: '15:30', value: 105.10 },
  { time: '16:00', value: 106.30 },
  { time: '16:30', value: 108.50 },
  { time: '17:00', value: 110.20 },
  { time: '09:30', value: 111.80 },
  { time: '10:00', value: 113.40 },
  { time: '10:30', value: 115.20 },
  { time: '11:00', value: 117.50 },
  { time: '11:30', value: 119.80 },
  { time: '12:00', value: 121.30 },
  { time: '12:30', value: 122.80 },
  { time: '13:00', value: 123.47 },
];

export const mockMarketData = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 198.80, change: +1.84, changePercent: +0.93 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 420.10, change: +3.20, changePercent: +0.77 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 175.60, change: +1.45, changePercent: +0.83 },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 178.90, change: -2.10, changePercent: -1.16 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 890.00, change: +12.50, changePercent: +1.42 },
  { symbol: 'AMZN', name: 'Amazon.com', price: 185.40, change: +2.30, changePercent: +1.26 },
  { symbol: 'META', name: 'Meta Platforms', price: 505.20, change: -3.80, changePercent: -0.75 },
  { symbol: 'JPM', name: 'JPMorgan Chase', price: 205.80, change: +1.20, changePercent: +0.59 },
];
