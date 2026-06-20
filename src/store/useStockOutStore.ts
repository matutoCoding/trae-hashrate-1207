import { create } from 'zustand';
import type { StockOut } from '@/types';
import { mockStockOuts } from '@/utils/mock';
import { useBatchStore } from './useBatchStore';

interface StockOutState {
  stockOuts: StockOut[];
  addStockOut: (stockOut: Omit<StockOut, 'id' | 'operator' | 'billId'> & { billId?: string | null }) => void;
  deleteStockOut: (id: string) => void;
  getStockOutById: (id: string) => StockOut | undefined;
  getStockOutsByBatch: (batchId: string) => StockOut[];
  getDestinationDistribution: () => { destination: string; quantity: number }[];
}

export const useStockOutStore = create<StockOutState>((set, get) => ({
  stockOuts: mockStockOuts,

  addStockOut: (stockOut) => {
    const newStockOut: StockOut = {
      ...stockOut,
      billId: stockOut.billId ?? null,
      id: `out-${Date.now()}`,
      operator: '当前用户',
    };

    useBatchStore.getState().updateRemaining(stockOut.batchId, stockOut.quantity);

    set((state) => ({ stockOuts: [...state.stockOuts, newStockOut] }));
  },

  deleteStockOut: (id) => {
    const stockOut = get().stockOuts.find((s) => s.id === id);
    if (stockOut) {
      useBatchStore.getState().updateRemaining(stockOut.batchId, -stockOut.quantity);
    }
    set((state) => ({
      stockOuts: state.stockOuts.filter((s) => s.id !== id),
    }));
  },

  getStockOutById: (id) => {
    return get().stockOuts.find((s) => s.id === id);
  },

  getStockOutsByBatch: (batchId) => {
    return get().stockOuts.filter((s) => s.batchId === batchId);
  },

  getDestinationDistribution: () => {
    const distribution: Record<string, number> = {};
    get().stockOuts.forEach((s) => {
      if (distribution[s.destination]) {
        distribution[s.destination] += s.quantity;
      } else {
        distribution[s.destination] = s.quantity;
      }
    });
    return Object.entries(distribution).map(([destination, quantity]) => ({
      destination,
      quantity,
    }));
  },
}));
