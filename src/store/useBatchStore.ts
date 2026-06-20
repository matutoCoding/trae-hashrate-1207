import { create } from 'zustand';
import type { Batch } from '@/types';
import { mockBatches } from '@/utils/mock';

interface BatchState {
  batches: Batch[];
  addBatch: (batch: Omit<Batch, 'id' | 'createdAt' | 'status'>) => void;
  updateBatch: (id: string, updates: Partial<Batch>) => void;
  deleteBatch: (id: string) => void;
  getBatchById: (id: string) => Batch | undefined;
  updateRemaining: (id: string, quantityChange: number) => void;
  getBatchesByType: (type: string) => Batch[];
  getWarningBatches: () => Batch[];
  getExpiredBatches: () => Batch[];
}

export const useBatchStore = create<BatchState>((set, get) => ({
  batches: mockBatches,

  addBatch: (batch) => {
    const newBatch: Batch = {
      ...batch,
      id: `batch-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'normal',
    };
    set((state) => ({ batches: [...state.batches, newBatch] }));
  },

  updateBatch: (id, updates) => {
    set((state) => ({
      batches: state.batches.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    }));
  },

  deleteBatch: (id) => {
    set((state) => ({
      batches: state.batches.filter((b) => b.id !== id),
    }));
  },

  getBatchById: (id) => {
    return get().batches.find((b) => b.id === id);
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
    return get().batches.filter((b) => b.instrumentType === type);
  },

  getWarningBatches: () => {
    return get().batches.filter((b) => b.status === 'warning');
  },

  getExpiredBatches: () => {
    return get().batches.filter((b) => b.status === 'expired');
  },
}));
