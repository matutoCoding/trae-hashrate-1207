export interface BillingRule {
  id: string;
  name: string;
  instrumentType: string;
  dailyRate: number;
  startingPrice: number;
  capPrice: number;
  isActive: boolean;
  createdAt: string;
}

export interface Batch {
  id: string;
  batchNo: string;
  instrumentType: string;
  instrumentName: string;
  totalQuantity: number;
  remainingQuantity: number;
  manufactureDate: string;
  expiryDate: string;
  status: 'normal' | 'warning' | 'expired';
  createdAt: string;
}

export interface Bill {
  id: string;
  billNo: string;
  batchId: string;
  ruleId: string;
  customerName: string;
  quantity: number;
  startDate: string;
  endDate: string;
  rentalDays: number;
  baseAmount: number;
  finalAmount: number;
  pricingType: 'normal' | 'starting' | 'cap';
  status: 'unpaid' | 'paid' | 'cancelled';
  createdAt: string;
}

export interface StockOut {
  id: string;
  batchId: string;
  billId: string | null;
  quantity: number;
  destination: string;
  receiver: string;
  needMaintenance: boolean;
  outDate: string;
  operator: string;
  remark: string;
}

export interface Maintenance {
  id: string;
  batchId: string;
  type: 'tuning' | 'repair' | 'cleaning';
  scheduledDate: string;
  completedDate: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  operator: string;
  remark: string;
}

export interface PricingResult {
  baseAmount: number;
  finalAmount: number;
  pricingType: 'normal' | 'starting' | 'cap';
}
