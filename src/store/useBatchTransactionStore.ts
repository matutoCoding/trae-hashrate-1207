import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BatchTransaction, BatchTransactionType } from '@/types';
import { getTodayString } from '@/utils/date';
import { useBatchStore } from './useBatchStore';

interface BatchTransactionState {
  transactions: BatchTransaction[];
  addTransaction: (
    transaction: Omit<BatchTransaction, 'id' | 'createdAt' | 'operator'>
  ) => BatchTransaction;
  getTransactionsByBatch: (batchId: string) => BatchTransaction[];
  getFilteredTransactions: (filters: {
    startDate?: string;
    endDate?: string;
    batchNo?: string;
    types?: BatchTransactionType[];
  }) => BatchTransaction[];
  clearTransactions: () => void;
}

export const useBatchTransactionStore = create<BatchTransactionState>()(
  persist(
    (set, get) => ({
      transactions: [],

      addTransaction: (transactionData) => {
        const transaction: BatchTransaction = {
          ...transactionData,
          id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: new Date().toISOString(),
          operator: '当前用户',
        };
        set((state) => ({
          transactions: [transaction, ...state.transactions],
        }));
        return transaction;
      },

      getTransactionsByBatch: (batchId) => {
        return get()
          .transactions.filter((t) => t.batchId === batchId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      getFilteredTransactions: (filters) => {
        const { startDate, endDate, batchNo, types } = filters;
        const batches = useBatchStore.getState().batches;
        const batchIdSet = batchNo
          ? new Set(
              batches
                .filter((b) =>
                  b.batchNo.toLowerCase().includes(batchNo.toLowerCase()) ||
                  b.instrumentName.toLowerCase().includes(batchNo.toLowerCase())
                )
                .map((b) => b.id)
            )
          : null;

        return get()
          .transactions.filter((t) => {
            if (types && types.length > 0 && !types.includes(t.type)) return false;
            if (batchIdSet && !batchIdSet.has(t.batchId)) return false;
            if (startDate) {
              const txDate = t.createdAt.split('T')[0];
              if (txDate < startDate) return false;
            }
            if (endDate) {
              const txDate = t.createdAt.split('T')[0];
              if (txDate > endDate) return false;
            }
            return true;
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      clearTransactions: () => {
        set({ transactions: [] });
      },
    }),
    {
      name: 'batch-transactions-storage',
    }
  )
);

export function createTransaction(
  batchId: string,
  type: BatchTransactionType,
  changes: {
    remainingBefore: number;
    remainingAfter: number;
    totalBefore: number;
    totalAfter: number;
    referenceId?: string | null;
    remark?: string;
  }
) {
  const {
    remainingBefore,
    remainingAfter,
    totalBefore,
    totalAfter,
    referenceId = null,
    remark = '',
  } = changes;

  return useBatchTransactionStore.getState().addTransaction({
    batchId,
    type,
    quantityChange: remainingAfter - remainingBefore,
    totalQuantityChange: totalAfter - totalBefore,
    remainingBefore,
    remainingAfter,
    totalBefore,
    totalAfter,
    referenceId,
    remark,
  });
}

export function getTransactionTypeLabel(type: BatchTransactionType): string {
  const labels: Record<BatchTransactionType, string> = {
    create: '创建批次',
    edit: '编辑批次',
    stock_out: '出库',
    revoke_out: '撤回出库',
    bill_cancel: '账单取消',
    adjustment: '数量调整',
  };
  return labels[type];
}
