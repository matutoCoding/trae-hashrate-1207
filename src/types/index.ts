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

export type BatchTransactionType = 
  | 'create' 
  | 'edit' 
  | 'stock_out' 
  | 'revoke_out' 
  | 'bill_cancel'
  | 'adjustment';

export interface BatchTransaction {
  id: string;
  batchId: string;
  type: BatchTransactionType;
  quantityChange: number;
  totalQuantityChange: number;
  remainingBefore: number;
  remainingAfter: number;
  totalBefore: number;
  totalAfter: number;
  referenceId: string | null;
  remark: string;
  operator: string;
  createdAt: string;
}

export type BillFulfillmentType = 
  | 'create'
  | 'stock_out'
  | 'revoke_out'
  | 'cancel'
  | 'mark_paid';

export interface BillFulfillmentLog {
  id: string;
  billId: string;
  type: BillFulfillmentType;
  quantity: number;
  remark: string;
  operator: string;
  createdAt: string;
}
