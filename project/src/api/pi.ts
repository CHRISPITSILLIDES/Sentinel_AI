import {
  mockFamilyMembers,
  mockGoals,
  mockShieldRules,
  mockTransactions,
  type Card,
  type FamilyMember,
  type Goal,
  type ShieldRule,
  type Transaction,
} from '../stores/appStore';

const cards: Card[] = [
  { id: 'card-1', name: 'Everyday card', cardType: 'debit', lastFour: '4821', brand: 'Visa', balance: 2840.5, currency: 'EUR', color: '#3b82f6', isActive: true },
  { id: 'card-2', name: 'Family savings', cardType: 'debit', lastFour: '7314', brand: 'Mastercard', balance: 6120, currency: 'EUR', color: '#10b981', isActive: true },
];

export const PI_URL = import.meta.env.VITE_PI_URL || 'http://127.0.0.1:3001';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${PI_URL}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...options?.headers },
  });
  if (!response.ok) throw new Error(`Pi server returned ${response.status}`);
  return response.json();
}

function readMembers(): FamilyMember[] {
  try {
    const stored = localStorage.getItem('nataconnect_members');
    return stored ? JSON.parse(stored) : mockFamilyMembers;
  } catch {
    return mockFamilyMembers;
  }
}

export const piAPI = {
  async getStatus() {
    return request<{ online: boolean; mode: string }>('/health');
  },
  async getMembers() {
    try {
      return await request<FamilyMember[]>('/family/members');
    } catch {
      return readMembers();
    }
  },
  async verifyPin(memberId: string, pin: string) {
    try {
      return await request<{ success: boolean }>(`/family/members/${encodeURIComponent(memberId)}/verify-pin`, { method: 'POST', body: JSON.stringify({ pin }) });
    } catch {
      const member = readMembers().find(item => item.id === memberId);
      return { success: Boolean(member && (!member.pin || member.pin === pin)) };
    }
  },
  async getCards(memberId: string): Promise<Card[]> {
    try { return await request<Card[]>(`/members/${encodeURIComponent(memberId)}/cards`); } catch { return cards; }
  },
  async getGoals(memberId: string): Promise<Goal[]> {
    try { return await request<Goal[]>(`/members/${encodeURIComponent(memberId)}/goals`); } catch { return mockGoals; }
  },
  async getShieldRules(memberId: string): Promise<ShieldRule[]> {
    try { return await request<ShieldRule[]>(`/members/${encodeURIComponent(memberId)}/shield-rules`); } catch { return mockShieldRules; }
  },
  async getTransactions(memberId: string): Promise<Transaction[]> {
    try { return await request<Transaction[]>(`/members/${encodeURIComponent(memberId)}/transactions`); } catch { return mockTransactions; }
  },
};
