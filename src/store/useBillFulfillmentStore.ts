import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BillFulfillmentLog, BillFulfillmentType } from '@/types';

interface BillFulfillmentState {
  logs: BillFulfillmentLog[];
  addLog: (
    log: Omit<BillFulfillmentLog, 'id' | 'createdAt' | 'operator'>
  ) => BillFulfillmentLog;
  getLogsByBill: (billId: string) => BillFulfillmentLog[];
  clearLogs: () => void;
}

export const useBillFulfillmentStore = create<BillFulfillmentState>()(
  persist(
    (set, get) => ({
      logs: [],

      addLog: (logData) => {
        const log: BillFulfillmentLog = {
          ...logData,
          id: `fl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: new Date().toISOString(),
          operator: '当前用户',
        };
        set((state) => ({
          logs: [log, ...state.logs],
        }));
        return log;
      },

      getLogsByBill: (billId) => {
        return get()
          .logs.filter((l) => l.billId === billId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      clearLogs: () => {
        set({ logs: [] });
      },
    }),
    {
      name: 'bill-fulfillment-storage',
    }
  )
);

export function createFulfillmentLog(
  billId: string,
  type: BillFulfillmentType,
  options: {
    quantity?: number;
    remark?: string;
  } = {}
) {
  const { quantity = 0, remark = '' } = options;

  return useBillFulfillmentStore.getState().addLog({
    billId,
    type,
    quantity,
    remark,
  });
}

export function getFulfillmentTypeLabel(type: BillFulfillmentType): string {
  const labels: Record<BillFulfillmentType, string> = {
    create: '创建账单',
    stock_out: '出库',
    revoke_out: '撤回出库',
    cancel: '取消账单',
    mark_paid: '标记收款',
  };
  return labels[type];
}
