import { create } from 'zustand';
import type { BillingRule } from '@/types';
import { mockBillingRules } from '@/utils/mock';

interface BillingRuleState {
  rules: BillingRule[];
  addRule: (rule: Omit<BillingRule, 'id' | 'createdAt'>) => void;
  updateRule: (id: string, updates: Partial<BillingRule>) => void;
  deleteRule: (id: string) => void;
  toggleRule: (id: string) => void;
  getRuleById: (id: string) => BillingRule | undefined;
  getActiveRules: () => BillingRule[];
}

export const useBillingRuleStore = create<BillingRuleState>((set, get) => ({
  rules: mockBillingRules,

  addRule: (rule) => {
    const newRule: BillingRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    set((state) => ({ rules: [...state.rules, newRule] }));
  },

  updateRule: (id, updates) => {
    set((state) => ({
      rules: state.rules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
  },

  deleteRule: (id) => {
    set((state) => ({
      rules: state.rules.filter((r) => r.id !== id),
    }));
  },

  toggleRule: (id) => {
    set((state) => ({
      rules: state.rules.map((r) =>
        r.id === id ? { ...r, isActive: !r.isActive } : r
      ),
    }));
  },

  getRuleById: (id) => {
    return get().rules.find((r) => r.id === id);
  },

  getActiveRules: () => {
    return get().rules.filter((r) => r.isActive);
  },
}));
