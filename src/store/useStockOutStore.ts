import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StockOut } from '@/types';
import { mockStockOuts } from '@/utils/mock';
import { useBatchStore } from './useBatchStore';

interface StockOutState {
  stockOuts: StockOut[];
  addStockOut: (stockOut: Omit<StockOut, 'id' | 'operator' | 'billId'> & { billId?: string | null }) => StockOut;
  deleteStockOut: (id: string) => void;
  getStockOutById: (id: string) => StockOut | undefined;
  getStockOutsByBatch: (batchId: string) => StockOut[];
  getStockOutsByBill: (billId: string) => StockOut[];
  getDestinationDistribution: () => { destination: string; quantity: number }[];
  getDestinationDistributionByBatch: (batchId: string) => { destination: string; quantity: number }[];
  getTotalOutQuantityByBatch: (batchId: string) => number;
  getTotalOutQuantityByBill: (billId: string) => number;
  revokeStockOut: (id: string) => void;
}

export const useStockOutStore = create<StockOutState>()(
  persist(
    (set, get) => ({
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
        return newStockOut;
      },

      deleteStockOut: (id) => {
        const stockOut = get().stockOuts.find((s) => s.id === id);
        if (stockOut) {
          useBatchStore
            .getState()
            .updateRemaining(stockOut.batchId, -stockOut.quantity);
        }
        set((state) => ({
          stockOuts: state.stockOuts.filter((s) => s.id !== id),
        }));
      },

      revokeStockOut: (id) => {
        const stockOut = get().stockOuts.find((s) => s.id === id);
        if (stockOut) {
          useBatchStore
            .getState()
            .updateRemaining(stockOut.batchId, -stockOut.quantity);
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

      getStockOutsByBill: (billId) => {
        return get().stockOuts.filter((s) => s.billId === billId);
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

      getDestinationDistributionByBatch: (batchId) => {
        const distribution: Record<string, number> = {};
        get()
          .stockOuts.filter((s) => s.batchId === batchId)
          .forEach((s) => {
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

      getTotalOutQuantityByBatch: (batchId) => {
        return get()
          .stockOuts.filter((s) => s.batchId === batchId)
          .reduce((sum, s) => sum + s.quantity, 0);
      },

      getTotalOutQuantityByBill: (billId) => {
        return get()
          .stockOuts.filter((s) => s.billId === billId)
          .reduce((sum, s) => sum + s.quantity, 0);
      },
    }),
    {
      name: 'stock-outs-storage',
    }
  )
);
