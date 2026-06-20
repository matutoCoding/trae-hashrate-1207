import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Batch } from '@/types';
import { mockBatches } from '@/utils/mock';
import { getBatchStatus } from '@/utils/date';
import { createTransaction } from './useBatchTransactionStore';

interface BatchState {
  batches: Batch[];
  addBatch: (batch: Omit<Batch, 'id' | 'createdAt' | 'status' | 'remainingQuantity'> & { remainingQuantity?: number }) => Batch;
  updateBatch: (id: string, updates: Partial<Omit<Batch, 'status'>>) => Batch | undefined;
  deleteBatch: (id: string) => void;
  getBatchById: (id: string) => Batch | undefined;
  updateRemaining: (id: string, quantityChange: number, options?: { referenceId?: string | null; remark?: string; txType?: 'stock_out' | 'revoke_out' | 'bill_cancel' | 'adjustment' }) => void;
  getBatchesByType: (type: string) => Batch[];
  getWarningBatches: () => Batch[];
  getExpiredBatches: () => Batch[];
  getBatchesWithStatus: () => Batch[];
  getBatchWithStatusById: (id: string) => Batch | undefined;
}

function computeBatchStatus(batch: Batch): Batch {
  return {
    ...batch,
    status: getBatchStatus(batch.expiryDate),
  };
}

export const useBatchStore = create<BatchState>()(
  persist(
    (set, get) => ({
      batches: mockBatches,

      addBatch: (batch) => {
        const totalQuantity = batch.totalQuantity;
        const remainingQuantity = batch.remainingQuantity ?? batch.totalQuantity;
        const newBatch: Batch = computeBatchStatus({
          ...batch,
          id: `batch-${Date.now()}`,
          createdAt: new Date().toISOString().split('T')[0],
          remainingQuantity,
          totalQuantity,
          status: 'normal',
        });
        set((state) => ({ batches: [...state.batches, newBatch] }));
        
        createTransaction(newBatch.id, 'create', {
          remainingBefore: 0,
          remainingAfter: remainingQuantity,
          totalBefore: 0,
          totalAfter: totalQuantity,
          remark: '创建批次',
        });
        
        return newBatch;
      },

      updateBatch: (id, updates) => {
        let updatedBatch: Batch | undefined;
        set((state) => {
          const oldBatch = state.batches.find((b) => b.id === id);
          if (!oldBatch) return state;

          const newTotal = updates.totalQuantity !== undefined ? updates.totalQuantity : oldBatch.totalQuantity;
          const oldRemaining = oldBatch.remainingQuantity;
          const usedQuantity = oldBatch.totalQuantity - oldRemaining;
          const newRemaining = Math.max(0, newTotal - usedQuantity);

          const finalUpdates = { ...updates };
          if (updates.totalQuantity !== undefined) {
            finalUpdates.remainingQuantity = newRemaining;
          }

          const changes: string[] = [];
          if (updates.instrumentType && updates.instrumentType !== oldBatch.instrumentType) {
            changes.push(`类型: ${oldBatch.instrumentType} → ${updates.instrumentType}`);
          }
          if (updates.instrumentName && updates.instrumentName !== oldBatch.instrumentName) {
            changes.push(`名称变更`);
          }
          if (updates.expiryDate && updates.expiryDate !== oldBatch.expiryDate) {
            changes.push(`效期: ${oldBatch.expiryDate} → ${updates.expiryDate}`);
          }
          if (updates.totalQuantity !== undefined && updates.totalQuantity !== oldBatch.totalQuantity) {
            changes.push(`总数: ${oldBatch.totalQuantity} → ${newTotal}`);
          }

          updatedBatch = computeBatchStatus({ ...oldBatch, ...finalUpdates });

          if (updates.totalQuantity !== undefined || updates.remainingQuantity !== undefined) {
            createTransaction(id, 'edit', {
              remainingBefore: oldRemaining,
              remainingAfter: finalUpdates.remainingQuantity ?? oldRemaining,
              totalBefore: oldBatch.totalQuantity,
              totalAfter: newTotal,
              remark: changes.join('; ') || '编辑批次信息',
            });
          } else if (changes.length > 0) {
            createTransaction(id, 'edit', {
              remainingBefore: oldRemaining,
              remainingAfter: oldRemaining,
              totalBefore: oldBatch.totalQuantity,
              totalAfter: oldBatch.totalQuantity,
              remark: changes.join('; '),
            });
          }

          return {
            batches: state.batches.map((b) =>
              b.id === id ? updatedBatch! : b
            ),
          };
        });
        return updatedBatch;
      },

      deleteBatch: (id) => {
        set((state) => ({
          batches: state.batches.filter((b) => b.id !== id),
        }));
      },

      getBatchById: (id) => {
        const batch = get().batches.find((b) => b.id === id);
        return batch ? computeBatchStatus(batch) : undefined;
      },

      updateRemaining: (id, quantityChange, options = {}) => {
        const { referenceId = null, remark = '', txType } = options;
        set((state) => {
          const batch = state.batches.find((b) => b.id === id);
          if (!batch) return state;

          const oldRemaining = batch.remainingQuantity;
          const newRemaining = Math.max(0, oldRemaining - quantityChange);

          if (txType) {
            createTransaction(id, txType, {
              remainingBefore: oldRemaining,
              remainingAfter: newRemaining,
              totalBefore: batch.totalQuantity,
              totalAfter: batch.totalQuantity,
              referenceId,
              remark,
            });
          }

          return {
            batches: state.batches.map((b) =>
              b.id === id
                ? {
                    ...b,
                    remainingQuantity: newRemaining,
                  }
                : b
            ),
          };
        });
      },

      getBatchesByType: (type) => {
        return get()
          .batches.filter((b) => b.instrumentType === type)
          .map(computeBatchStatus);
      },

      getWarningBatches: () => {
        return get()
          .batches.filter((b) => getBatchStatus(b.expiryDate) === 'warning')
          .map(computeBatchStatus);
      },

      getExpiredBatches: () => {
        return get()
          .batches.filter((b) => getBatchStatus(b.expiryDate) === 'expired')
          .map(computeBatchStatus);
      },

      getBatchesWithStatus: () => {
        return get().batches.map(computeBatchStatus);
      },

      getBatchWithStatusById: (id) => {
        const batch = get().batches.find((b) => b.id === id);
        return batch ? computeBatchStatus(batch) : undefined;
      },
    }),
    {
      name: 'batches-storage',
    }
  )
);
