import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Batch } from '@/types';
import { mockBatches } from '@/utils/mock';
import { getBatchStatus } from '@/utils/date';

interface BatchState {
  batches: Batch[];
  addBatch: (batch: Omit<Batch, 'id' | 'createdAt' | 'status' | 'remainingQuantity'> & { remainingQuantity?: number }) => void;
  updateBatch: (id: string, updates: Partial<Omit<Batch, 'status'>>) => void;
  deleteBatch: (id: string) => void;
  getBatchById: (id: string) => Batch | undefined;
  updateRemaining: (id: string, quantityChange: number) => void;
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
        const newBatch: Batch = computeBatchStatus({
          ...batch,
          id: `batch-${Date.now()}`,
          createdAt: new Date().toISOString().split('T')[0],
          remainingQuantity: batch.remainingQuantity ?? batch.totalQuantity,
          status: 'normal',
        });
        set((state) => ({ batches: [...state.batches, newBatch] }));
      },

      updateBatch: (id, updates) => {
        set((state) => ({
          batches: state.batches.map((b) =>
            b.id === id ? computeBatchStatus({ ...b, ...updates }) : b
          ),
        }));
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

      updateRemaining: (id, quantityChange) => {
        set((state) => ({
          batches: state.batches.map((b) =>
            b.id === id
              ? {
                  ...b,
                  remainingQuantity: Math.max(
                    0,
                    b.remainingQuantity - quantityChange
                  ),
                }
              : b
          ),
        }));
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
