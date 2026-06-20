import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StockOut } from '@/types';
import { mockStockOuts } from '@/utils/mock';
import { useBatchStore } from './useBatchStore';
import { createFulfillmentLog } from './useBillFulfillmentStore';

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
        const billId = stockOut.billId ?? null;
        const newStockOut: StockOut = {
          ...stockOut,
          billId,
          id: `out-${Date.now()}`,
          operator: '当前用户',
        };

        useBatchStore.getState().updateRemaining(stockOut.batchId, stockOut.quantity, {
          referenceId: newStockOut.id,
          remark: `出库到${stockOut.destination}${billId ? '（关联账单）' : ''}`,
          txType: 'stock_out',
        });

        if (billId) {
          createFulfillmentLog(billId, 'stock_out', {
            quantity: stockOut.quantity,
            remark: `出库${stockOut.quantity}件到${stockOut.destination}，接收人：${stockOut.receiver}`,
          });
        }

        set((state) => ({ stockOuts: [...state.stockOuts, newStockOut] }));
        return newStockOut;
      },

      deleteStockOut: (id) => {
        const stockOut = get().stockOuts.find((s) => s.id === id);
        if (stockOut) {
          useBatchStore
            .getState()
            .updateRemaining(stockOut.batchId, -stockOut.quantity, {
              referenceId: stockOut.id,
              remark: `删除出库记录，从${stockOut.destination}撤回`,
              txType: 'revoke_out',
            });
          if (stockOut.billId) {
            createFulfillmentLog(stockOut.billId, 'revoke_out', {
              quantity: stockOut.quantity,
              remark: `撤回出库${stockOut.quantity}件（原去向：${stockOut.destination}）`,
            });
          }
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
            .updateRemaining(stockOut.batchId, -stockOut.quantity, {
              referenceId: stockOut.id,
              remark: `撤回出库，从${stockOut.destination}收回`,
              txType: 'revoke_out',
            });
          if (stockOut.billId) {
            createFulfillmentLog(stockOut.billId, 'revoke_out', {
              quantity: stockOut.quantity,
              remark: `撤回出库${stockOut.quantity}件（原去向：${stockOut.destination}）`,
            });
          }
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
