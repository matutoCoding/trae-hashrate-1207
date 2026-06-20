import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Bill } from '@/types';
import { mockBills } from '@/utils/mock';
import { calculateRentalPrice } from '@/utils/pricing';
import { calculateDays } from '@/utils/date';
import { useStockOutStore } from './useStockOutStore';
import { useBatchStore } from './useBatchStore';
import { createFulfillmentLog } from './useBillFulfillmentStore';

interface BillState {
  bills: Bill[];
  addBill: (
    bill: Omit<
      Bill,
      'id' | 'billNo' | 'rentalDays' | 'baseAmount' | 'finalAmount' | 'pricingType' | 'createdAt' | 'status'
    > & { dailyRate: number; startingPrice: number; capPrice: number }
  ) => Bill;
  updateBillStatus: (id: string, status: Bill['status']) => void;
  cancelBill: (id: string) => Bill | undefined;
  deleteBill: (id: string) => void;
  getBillById: (id: string) => Bill | undefined;
  getBillsByBatch: (batchId: string) => Bill[];
  getTotalRevenue: () => number;
  getUnpaidBills: () => Bill[];
  getBillOutQuantity: (billId: string) => number;
}

export const useBillStore = create<BillState>()(
  persist(
    (set, get) => ({
      bills: mockBills,

      addBill: (billData) => {
        const rentalDays = calculateDays(billData.startDate, billData.endDate);
        const pricing = calculateRentalPrice(
          billData.dailyRate,
          rentalDays,
          billData.startingPrice,
          billData.capPrice
        );

        const newBill: Bill = {
          id: `bill-${Date.now()}`,
          billNo: `ZL${new Date().getFullYear()}${String(
            new Date().getMonth() + 1
          ).padStart(2, '0')}${String(get().bills.length + 1).padStart(3, '0')}`,
          batchId: billData.batchId,
          ruleId: billData.ruleId,
          customerName: billData.customerName,
          quantity: billData.quantity,
          startDate: billData.startDate,
          endDate: billData.endDate,
          rentalDays,
          baseAmount: pricing.baseAmount * billData.quantity,
          finalAmount: pricing.finalAmount * billData.quantity,
          pricingType: pricing.pricingType,
          status: 'unpaid',
          createdAt: new Date().toISOString().split('T')[0],
        };

        set((state) => ({ bills: [...state.bills, newBill] }));

        createFulfillmentLog(newBill.id, 'create', {
          quantity: billData.quantity,
          remark: `创建账单${newBill.billNo}，租期${rentalDays}天，客户：${billData.customerName}`,
        });

        return newBill;
      },

      updateBillStatus: (id, status) => {
        set((state) => ({
          bills: state.bills.map((b) => (b.id === id ? { ...b, status } : b)),
        }));
        if (status === 'paid') {
          createFulfillmentLog(id, 'mark_paid', {
            remark: '标记为已收款',
          });
        }
      },

      cancelBill: (id) => {
        const bill = get().bills.find((b) => b.id === id);
        if (!bill || bill.status === 'cancelled') return undefined;

        const stockOuts = useStockOutStore.getState().getStockOutsByBill(id);
        stockOuts.forEach((out) => {
          useBatchStore.getState().updateRemaining(out.batchId, -out.quantity, {
            referenceId: id,
            remark: `账单取消${bill.billNo}，恢复出库${out.quantity}件`,
            txType: 'bill_cancel',
          });
          useStockOutStore.getState().deleteStockOut(out.id);
        });

        set((state) => ({
          bills: state.bills.map((b) => (b.id === id ? { ...b, status: 'cancelled' as const } : b)),
        }));

        createFulfillmentLog(id, 'cancel', {
          quantity: stockOuts.reduce((sum, o) => sum + o.quantity, 0),
          remark: `取消账单${bill.billNo}，已恢复${stockOuts.length}笔出库共${stockOuts.reduce((sum, o) => sum + o.quantity, 0)}件库存`,
        });

        return get().bills.find((b) => b.id === id);
      },

      deleteBill: (id) => {
        set((state) => ({
          bills: state.bills.filter((b) => b.id !== id),
        }));
      },

      getBillById: (id) => {
        return get().bills.find((b) => b.id === id);
      },

      getBillsByBatch: (batchId) => {
        return get().bills.filter((b) => b.batchId === batchId);
      },

      getTotalRevenue: () => {
        return get()
          .bills.filter((b) => b.status === 'paid')
          .reduce((sum, b) => sum + b.finalAmount, 0);
      },

      getUnpaidBills: () => {
        return get().bills.filter((b) => b.status === 'unpaid');
      },

      getBillOutQuantity: (billId) => {
        return useStockOutStore.getState().getTotalOutQuantityByBill(billId);
      },
    }),
    {
      name: 'bills-storage',
    }
  )
);
