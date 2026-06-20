import { create } from 'zustand';
import type { Bill } from '@/types';
import { mockBills } from '@/utils/mock';
import { calculateRentalPrice } from '@/utils/pricing';
import { calculateDays } from '@/utils/date';

interface BillState {
  bills: Bill[];
  addBill: (
    bill: Omit<
      Bill,
      'id' | 'billNo' | 'rentalDays' | 'baseAmount' | 'finalAmount' | 'pricingType' | 'createdAt' | 'status'
    > & { dailyRate: number; startingPrice: number; capPrice: number }
  ) => void;
  updateBillStatus: (id: string, status: Bill['status']) => void;
  deleteBill: (id: string) => void;
  getBillById: (id: string) => Bill | undefined;
  getBillsByBatch: (batchId: string) => Bill[];
  getTotalRevenue: () => number;
  getUnpaidBills: () => Bill[];
}

export const useBillStore = create<BillState>((set, get) => ({
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
  },

  updateBillStatus: (id, status) => {
    set((state) => ({
      bills: state.bills.map((b) => (b.id === id ? { ...b, status } : b)),
    }));
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
}));
