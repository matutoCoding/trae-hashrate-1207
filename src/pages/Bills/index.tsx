import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  X,
  FileText,
  Calendar,
  User,
  Tag,
  PackageOpen,
  AlertCircle,
  CheckCircle,
  Undo2,
  ArrowRight,
  Clock,
  History,
  Circle,
  DollarSign,
} from 'lucide-react';
import { useBillStore } from '@/store/useBillStore';
import { useBatchStore } from '@/store/useBatchStore';
import { useBillingRuleStore } from '@/store/useBillingRuleStore';
import { useStockOutStore } from '@/store/useStockOutStore';
import { useBillFulfillmentStore, getFulfillmentTypeLabel } from '@/store/useBillFulfillmentStore';
import type { BillFulfillmentLog } from '@/types';
import {
  formatCurrency,
  getPricingTypeLabel,
  calculateRentalPrice,
} from '@/utils/pricing';
import { calculateDays, getTodayString } from '@/utils/date';
import type { Bill, StockOut } from '@/types';

export default function Bills() {
  const { bills, addBill, updateBillStatus, getBillById, deleteBill, cancelBill } =
    useBillStore();
  const { getBatchesWithStatus, getBatchById } = useBatchStore();
  const { getActiveRules, getRulesByInstrumentType } = useBillingRuleStore();
  const {
    addStockOut,
    getStockOutsByBill,
    getTotalOutQuantityByBill,
    revokeStockOut,
  } = useStockOutStore();
  const { getLogsByBill } = useBillFulfillmentStore();

  const batches = getBatchesWithStatus();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStockOutModalOpen, setIsStockOutModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    batchId: '',
    ruleId: '',
    customerName: '',
    quantity: 1,
    startDate: getTodayString(),
    endDate: getTodayString(),
  });

  const [stockOutForm, setStockOutForm] = useState({
    quantity: 1,
    destination: '',
    receiver: '',
    needMaintenance: false,
    outDate: getTodayString(),
    remark: '',
  });

  const selectedBatch = useMemo(() => {
    if (!formData.batchId) return null;
    return getBatchById(formData.batchId);
  }, [formData.batchId, getBatchById]);

  const availableRules = useMemo(() => {
    if (!selectedBatch) {
      return getActiveRules();
    }
    const typeRules = getRulesByInstrumentType(selectedBatch.instrumentType);
    return typeRules.length > 0 ? typeRules : getActiveRules();
  }, [selectedBatch, getRulesByInstrumentType, getActiveRules]);

  const selectedRule = useMemo(() => {
    if (!formData.ruleId) return null;
    return availableRules.find((r) => r.id === formData.ruleId);
  }, [formData.ruleId, availableRules]);

  const dateError = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return '';
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (end < start) {
      return '结束日期不能早于开始日期';
    }
    return '';
  }, [formData.startDate, formData.endDate]);

  const rentalDays = useMemo(() => {
    if (!formData.startDate || !formData.endDate || dateError) return 0;
    return calculateDays(formData.startDate, formData.endDate);
  }, [formData.startDate, formData.endDate, dateError]);

  const pricePreview = useMemo(() => {
    if (!selectedRule || rentalDays <= 0 || formData.quantity <= 0) {
      return null;
    }
    const result = calculateRentalPrice(
      selectedRule.dailyRate,
      rentalDays,
      selectedRule.startingPrice,
      selectedRule.capPrice
    );
    return {
      ...result,
      baseAmount: result.baseAmount * formData.quantity,
      finalAmount: result.finalAmount * formData.quantity,
    };
  }, [selectedRule, rentalDays, formData.quantity]);

  const maxQuantity = selectedBatch?.remainingQuantity || 0;

  const quantityError = useMemo(() => {
    if (formData.quantity > maxQuantity) {
      return `租赁数量不能超过库存数量 (${maxQuantity}件)`;
    }
    if (formData.quantity <= 0) {
      return '租赁数量必须大于0';
    }
    return '';
  }, [formData.quantity, maxQuantity]);

  const isFormValid =
    formData.customerName &&
    formData.batchId &&
    formData.ruleId &&
    formData.quantity > 0 &&
    formData.startDate &&
    formData.endDate &&
    !dateError &&
    !quantityError;

  const filteredBills = bills.filter((bill) => {
    const matchesSearch =
      bill.billNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || bill.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Bill['status']) => {
    const styles = {
      paid: 'badge-success',
      unpaid: 'badge-warning',
      cancelled: 'badge-neutral',
    };
    const labels = {
      paid: '已收款',
      unpaid: '待收款',
      cancelled: '已取消',
    };
    return (
      <span className={`badge ${styles[status]}`}>{labels[status]}</span>
    );
  };

  const getPricingBadge = (type: Bill['pricingType']) => {
    const styles = {
      normal: 'badge-neutral',
      starting: 'badge-warning',
      cap: 'badge-success',
    };
    return (
      <span className={`badge ${styles[type]}`}>
        {getPricingTypeLabel(type)}
      </span>
    );
  };

  const handleBatchChange = (batchId: string) => {
    const batch = getBatchById(batchId);
    const newFormData = { ...formData, batchId };

    if (batch) {
      const typeRules = getRulesByInstrumentType(batch.instrumentType);
      if (typeRules.length > 0) {
        newFormData.ruleId = typeRules[0].id;
      } else if (availableRules.length > 0) {
        newFormData.ruleId = availableRules[0].id;
      } else {
        newFormData.ruleId = '';
      }

      if (formData.quantity > batch.remainingQuantity) {
        newFormData.quantity = batch.remainingQuantity;
      }
    }

    setFormData(newFormData);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !selectedRule) return;

    const newBill = addBill({
      ...formData,
      dailyRate: selectedRule.dailyRate,
      startingPrice: selectedRule.startingPrice,
      capPrice: selectedRule.capPrice,
    });

    setIsCreateModalOpen(false);
    setFormData({
      batchId: '',
      ruleId: '',
      customerName: '',
      quantity: 1,
      startDate: getTodayString(),
      endDate: getTodayString(),
    });

    setTimeout(() => {
      const bill = getBillById(newBill.id);
      if (bill) {
        setSelectedBill(bill);
      }
    }, 0);
  };

  const viewBillDetail = (bill: Bill) => {
    setSelectedBill(bill);
  };

  const openStockOutModal = () => {
    if (!selectedBill) return;
    const batch = getBatchById(selectedBill.batchId);
    const alreadyOut = getTotalOutQuantityByBill(selectedBill.id);
    const remaining = selectedBill.quantity - alreadyOut;
    const available = batch ? Math.min(batch.remainingQuantity, remaining) : 0;

    setStockOutForm({
      quantity: Math.max(1, available),
      destination: selectedBill.customerName,
      receiver: selectedBill.customerName,
      needMaintenance: false,
      outDate: getTodayString(),
      remark: '',
    });
    setIsStockOutModalOpen(true);
  };

  const handleStockOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;

    const alreadyOut = getTotalOutQuantityByBill(selectedBill.id);
    const remaining = selectedBill.quantity - alreadyOut;

    if (stockOutForm.quantity > remaining) {
      alert(`出库数量不能超过账单剩余未出库数量 (${remaining}件)`);
      return;
    }

    const batch = getBatchById(selectedBill.batchId);
    if (batch && stockOutForm.quantity > batch.remainingQuantity) {
      alert(`出库数量不能超过批次剩余库存 (${batch.remainingQuantity}件)`);
      return;
    }

    addStockOut({
      ...stockOutForm,
      batchId: selectedBill.batchId,
      billId: selectedBill.id,
    });

    setIsStockOutModalOpen(false);

    const updatedBill = getBillById(selectedBill.id);
    if (updatedBill) {
      setSelectedBill(updatedBill);
    }
  };

  const handleCancelBill = () => {
    if (!selectedBill) return;

    const billStockOuts = getStockOutsByBill(selectedBill.id);
    if (billStockOuts.length > 0) {
      if (
        !confirm(
          `该账单已有 ${billStockOuts.length} 笔出库记录，取消账单将同时撤回所有出库并恢复库存。确定要取消吗？`
        )
      ) {
        return;
      }
    } else {
      if (!confirm('确定要取消该账单吗？')) return;
    }

    const updated = cancelBill(selectedBill.id);
    if (updated) setSelectedBill(updated);
  };

  const handleRevokeStockOut = (stockOutId: string) => {
    if (!confirm('确定要撤回这笔出库吗？撤回后库存将恢复。')) return;
    revokeStockOut(stockOutId);
    if (selectedBill) {
      const updated = getBillById(selectedBill.id);
      if (updated) setSelectedBill(updated);
    }
  };

  const billStockOuts = selectedBill
    ? getStockOutsByBill(selectedBill.id)
    : [];
  const billOutQuantity = selectedBill
    ? getTotalOutQuantityByBill(selectedBill.id)
    : 0;
  const fulfillmentLogs = selectedBill
    ? getLogsByBill(selectedBill.id)
    : [];

  const getFulfillmentLogStyle = (type: BillFulfillmentLog['type']) => {
    const styles = {
      create: {
        dot: 'bg-teal-500',
        line: 'bg-teal-200',
        badge: 'bg-teal-50 text-teal-700 border-teal-200',
      },
      stock_out: {
        dot: 'bg-gold-500',
        line: 'bg-gold-200',
        badge: 'bg-gold-50 text-gold-700 border-gold-200',
      },
      revoke_out: {
        dot: 'bg-blue-500',
        line: 'bg-blue-200',
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
      },
      cancel: {
        dot: 'bg-red-500',
        line: 'bg-red-200',
        badge: 'bg-red-50 text-red-700 border-red-200',
      },
      mark_paid: {
        dot: 'bg-emerald-500',
        line: 'bg-emerald-200',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      },
    };
    return styles[type];
  };

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-sandalwood-900 mb-1">
            账单管理
          </h1>
          <p className="text-sandalwood-500 text-sm">
            查看和管理所有租赁账单，支持从账单发起出库
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary gap-2"
        >
          <Plus className="w-4 h-4" />
          新建账单
        </button>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sandalwood-400" />
            <input
              type="text"
              className="input pl-10"
              placeholder="搜索账单号、客户名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sandalwood-400" />
            <select
              className="input pl-10 pr-8 appearance-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">全部状态</option>
              <option value="unpaid">待收款</option>
              <option value="paid">已收款</option>
              <option value="cancelled">已取消</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sandalwood-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBills.map((bill) => {
          const batch = getBatchById(bill.batchId);
          const outQty = getTotalOutQuantityByBill(bill.id);
          return (
            <div
              key={bill.id}
              className="card p-5 hover:shadow-card-hover transition-all cursor-pointer"
              onClick={() => viewBillDetail(bill)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-sandalwood-900">
                    {bill.billNo}
                  </h3>
                  <p className="text-sm text-sandalwood-500">
                    {batch?.instrumentName || '未知乐器'}
                  </p>
                </div>
                {getStatusBadge(bill.status)}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-sandalwood-400" />
                  <span className="text-sandalwood-600">
                    {bill.customerName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-sandalwood-400" />
                  <span className="text-sandalwood-600">
                    {bill.startDate} ~ {bill.endDate}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="w-4 h-4 text-sandalwood-400" />
                  <span className="text-sandalwood-600">
                    {bill.quantity} 件 · {bill.rentalDays} 天
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <PackageOpen className="w-4 h-4 text-sandalwood-400" />
                  <span className="text-sandalwood-600">
                    已出库 {outQty}/{bill.quantity} 件
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-sandalwood-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-sandalwood-500">账单金额</p>
                  <p className="text-xl font-bold text-sandalwood-900">
                    {formatCurrency(bill.finalAmount)}
                  </p>
                </div>
                {getPricingBadge(bill.pricingType)}
              </div>
            </div>
          );
        })}
      </div>

      {filteredBills.length === 0 && (
        <div className="card p-12 text-center">
          <FileText className="w-16 h-16 text-sandalwood-300 mx-auto mb-4" />
          <p className="text-sandalwood-500">暂无账单记录</p>
        </div>
      )}

      {selectedBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-sandalwood-100 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold text-sandalwood-900">
                账单详情
              </h2>
              <button
                onClick={() => setSelectedBill(null)}
                className="text-sandalwood-400 hover:text-sandalwood-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-sandalwood-500">账单号</p>
                  <p className="text-lg font-semibold text-sandalwood-900">
                    {selectedBill.billNo}
                  </p>
                </div>
                {getStatusBadge(selectedBill.status)}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-sandalwood-50 rounded-lg p-4">
                  <p className="text-xs text-sandalwood-500 mb-1">客户名称</p>
                  <p className="font-medium text-sandalwood-900">
                    {selectedBill.customerName}
                  </p>
                </div>
                <div className="bg-sandalwood-50 rounded-lg p-4">
                  <p className="text-xs text-sandalwood-500 mb-1">乐器批次</p>
                  <p className="font-medium text-sandalwood-900">
                    {getBatchById(selectedBill.batchId)?.instrumentName ||
                      '未知'}
                  </p>
                  <p className="text-xs text-sandalwood-500">
                    {getBatchById(selectedBill.batchId)?.batchNo}
                  </p>
                </div>
              </div>

              <div className="bg-sandalwood-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-sandalwood-400" />
                  <span className="text-sm text-sandalwood-600">租赁周期</span>
                </div>
                <p className="font-medium text-sandalwood-900">
                  {selectedBill.startDate} 至 {selectedBill.endDate}
                </p>
                <p className="text-sm text-sandalwood-500 mt-1">
                  共 {selectedBill.rentalDays} 天
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-sandalwood-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-sandalwood-500 mb-1">租赁数量</p>
                  <p className="text-lg font-bold text-sandalwood-900">
                    {selectedBill.quantity}
                    <span className="text-sm font-normal text-sandalwood-500 ml-1">
                      件
                    </span>
                  </p>
                </div>
                <div className="bg-teal-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-teal-600 mb-1">已出库</p>
                  <p className="text-lg font-bold text-teal-700">
                    {billOutQuantity}
                    <span className="text-sm font-normal text-teal-500 ml-1">
                      件
                    </span>
                  </p>
                </div>
                <div className="bg-gold-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-gold-600 mb-1">待出库</p>
                  <p className="text-lg font-bold text-gold-700">
                    {selectedBill.quantity - billOutQuantity}
                    <span className="text-sm font-normal text-gold-500 ml-1">
                      件
                    </span>
                  </p>
                </div>
              </div>

              <div className="bg-gold-50 rounded-xl p-4 border border-gold-100">
                <h3 className="font-medium text-gold-800 mb-3">费用明细</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gold-600">基础租金</span>
                    <span className="text-gold-800">
                      {formatCurrency(selectedBill.baseAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gold-600">计费方式</span>
                    {getPricingBadge(selectedBill.pricingType)}
                  </div>
                  {selectedBill.pricingType === 'starting' && (
                    <p className="text-xs text-gold-500 italic">
                      * 基础租金低于起步价，按起步价收取
                    </p>
                  )}
                  {selectedBill.pricingType === 'cap' && (
                    <p className="text-xs text-gold-500 italic">
                      * 基础租金超过封顶价，按封顶价收取
                    </p>
                  )}
                  <div className="border-t border-gold-200 pt-2 mt-2 flex justify-between">
                    <span className="font-medium text-gold-800">应收金额</span>
                    <span className="text-xl font-bold text-gold-700">
                      {formatCurrency(selectedBill.finalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-sandalwood-900 flex items-center gap-2">
                    <PackageOpen className="w-4 h-4" />
                    出库记录
                    <span className="text-sm text-sandalwood-400 font-normal">
                      (共 {billStockOuts.length} 笔)
                    </span>
                  </h3>
                  {selectedBill.status !== 'cancelled' &&
                    billOutQuantity < selectedBill.quantity && (
                      <button
                        onClick={openStockOutModal}
                        className="btn btn-teal text-sm gap-1 py-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        发起出库
                      </button>
                    )}
                </div>
                {billStockOuts.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {billStockOuts.map((out) => (
                      <div
                        key={out.id}
                        className="flex items-center justify-between p-3 bg-sandalwood-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-sandalwood-900">
                            {out.destination}
                          </p>
                          <p className="text-xs text-sandalwood-500">
                            {out.outDate} · {out.receiver}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-sandalwood-700">
                            {out.quantity} 件
                          </span>
                          {selectedBill.status !== 'cancelled' && (
                            <button
                              onClick={() => handleRevokeStockOut(out.id)}
                              className="text-red-500 hover:text-red-600 p-1"
                              title="撤回出库"
                            >
                              <Undo2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-sandalwood-400 text-center py-4">
                    暂无出库记录
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-sandalwood-900 flex items-center gap-2">
                    <History className="w-4 h-4" />
                    履约进度
                    <span className="text-sm text-sandalwood-400 font-normal">
                      (共 {fulfillmentLogs.length} 条流转记录)
                    </span>
                  </h3>
                </div>

                {selectedBill && (
                  <FulfillmentSteps
                    bill={selectedBill}
                    stockOuts={billStockOuts}
                    logs={fulfillmentLogs}
                  />
                )}

                <div className="mt-5">
                  <p className="text-xs text-sandalwood-500 mb-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    流转明细
                  </p>
                {fulfillmentLogs.length > 0 ? (
                  <div className="relative pl-6">
                    <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-sandalwood-100" />
                    {fulfillmentLogs.map((log, idx) => {
                      const style = getFulfillmentLogStyle(log.type);
                      const isLast = idx === fulfillmentLogs.length - 1;
                      return (
                        <div key={log.id} className="relative pb-5 last:pb-0">
                          <div
                            className={`absolute -left-4 top-1 w-4 h-4 rounded-full ${style.dot} border-2 border-white shadow-sm flex items-center justify-center`}
                          >
                            <Circle className="w-1.5 h-1.5 text-white fill-white" />
                          </div>
                          <div
                            className={`rounded-lg border p-3 ${style.badge}`}
                          >
                            <div className="flex items-start justify-between mb-1.5 gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">
                                  {getFulfillmentTypeLabel(log.type)}
                                </span>
                                {log.quantity > 0 && (
                                  <span className="text-xs font-medium bg-white/80 px-2 py-0.5 rounded-full">
                                    数量: {log.quantity} 件
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-xs opacity-80 flex-shrink-0">
                                <Clock className="w-3 h-3" />
                                {formatDateTime(log.createdAt)}
                              </div>
                            </div>
                            {log.remark && (
                              <p className="text-xs opacity-90 leading-relaxed">
                                {log.remark}
                              </p>
                            )}
                            <p className="text-xs opacity-60 mt-1.5">
                              操作人: {log.operator}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-sandalwood-400 text-center py-4">
                    暂无履约记录
                  </p>
                )}
                </div>
              </div>

              {selectedBill.status === 'unpaid' && (
                <div className="flex gap-3 pt-4 border-t border-sandalwood-100">
                  <button
                    onClick={handleCancelBill}
                    className="btn btn-secondary flex-1"
                  >
                    取消账单
                  </button>
                  <button
                    onClick={() => {
                      updateBillStatus(selectedBill.id, 'paid');
                      const updated = getBillById(selectedBill.id);
                      if (updated) setSelectedBill(updated);
                    }}
                    className="btn btn-teal flex-1"
                  >
                    确认收款
                  </button>
                </div>
              )}

              {selectedBill.status === 'paid' && (
                <div className="flex gap-3 pt-4 border-t border-sandalwood-100">
                  <button
                    onClick={handleCancelBill}
                    className="btn btn-secondary flex-1"
                  >
                    取消账单（需退款）
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-sandalwood-100 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold text-sandalwood-900">
                新建账单
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-sandalwood-400 hover:text-sandalwood-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">客户名称</label>
                <input
                  type="text"
                  className="input"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({ ...formData, customerName: e.target.value })
                  }
                  placeholder="请输入客户名称"
                  required
                />
              </div>

              <div>
                <label className="label">选择批次</label>
                <select
                  className="input"
                  value={formData.batchId}
                  onChange={(e) => handleBatchChange(e.target.value)}
                  required
                >
                  <option value="">请选择乐器批次</option>
                  {batches
                    .filter((b) => b.status !== 'expired')
                    .map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.instrumentName} ({batch.batchNo}) - 剩余
                        {batch.remainingQuantity}件
                      </option>
                    ))}
                </select>
                {selectedBatch && (
                  <p className="text-xs text-sandalwood-500 mt-1">
                    乐器类型：{selectedBatch.instrumentType}
                  </p>
                )}
              </div>

              <div>
                <label className="label">计费规则</label>
                <select
                  className="input"
                  value={formData.ruleId}
                  onChange={(e) =>
                    setFormData({ ...formData, ruleId: e.target.value })
                  }
                  required
                >
                  <option value="">请选择计费规则</option>
                  {availableRules.map((rule) => (
                    <option key={rule.id} value={rule.id}>
                      {rule.name} - {formatCurrency(rule.dailyRate)}/天
                      (起步{formatCurrency(rule.startingPrice)} / 封顶
                      {formatCurrency(rule.capPrice)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">租赁数量</label>
                <input
                  type="number"
                  className="input"
                  min="1"
                  max={maxQuantity}
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: Math.max(
                        1,
                        Math.min(
                          maxQuantity,
                          Number(e.target.value)
                        )
                      ),
                    })
                  }
                  required
                />
                {quantityError && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {quantityError}
                  </p>
                )}
                {selectedBatch && !quantityError && (
                  <p className="text-xs text-sandalwood-500 mt-1">
                    可用库存：{selectedBatch.remainingQuantity} 件
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">开始日期</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="label">结束日期</label>
                  <input
                    type="date"
                    className={`input ${dateError ? 'border-red-400 focus:ring-red-400' : ''}`}
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              {dateError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-red-600">{dateError}</span>
                </div>
              )}

              {rentalDays > 0 && !dateError && (
                <div className="p-3 bg-sandalwood-50 rounded-lg">
                  <p className="text-sm text-sandalwood-600">
                    租赁天数：
                    <span className="font-semibold text-sandalwood-900">
                      {rentalDays} 天
                    </span>
                  </p>
                </div>
              )}

              {pricePreview && (
                <div className="bg-gold-50 rounded-xl p-4 border border-gold-100">
                  <h4 className="font-medium text-gold-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-teal-500" />
                    费用试算
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gold-600">基础租金</span>
                      <span className="text-gold-800">
                        {formatCurrency(pricePreview.baseAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gold-600">计费方式</span>
                      {getPricingBadge(pricePreview.pricingType)}
                    </div>
                    {pricePreview.pricingType === 'starting' && (
                      <p className="text-xs text-gold-500 italic">
                        * 租期较短，按起步价收取
                      </p>
                    )}
                    {pricePreview.pricingType === 'cap' && (
                      <p className="text-xs text-gold-500 italic">
                        * 租期较长，按封顶价收取
                      </p>
                    )}
                    <div className="border-t border-gold-200 pt-2 mt-2 flex justify-between">
                      <span className="font-medium text-gold-800">
                        预估金额
                      </span>
                      <span className="text-xl font-bold text-gold-700">
                        {formatCurrency(pricePreview.finalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-secondary flex-1"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={!isFormValid}
                >
                  创建账单
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isStockOutModalOpen && selectedBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-sandalwood-100 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold text-sandalwood-900">
                发起出库
              </h2>
              <button
                onClick={() => setIsStockOutModalOpen(false)}
                className="text-sandalwood-400 hover:text-sandalwood-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleStockOutSubmit} className="p-6 space-y-4">
              <div className="bg-sandalwood-50 rounded-lg p-4">
                <p className="text-sm text-sandalwood-500 mb-1">关联账单</p>
                <p className="font-medium text-sandalwood-900">
                  {selectedBill.billNo} - {selectedBill.customerName}
                </p>
                <p className="text-xs text-sandalwood-500 mt-1">
                  已出库 {billOutQuantity}/{selectedBill.quantity} 件，剩余
                  {selectedBill.quantity - billOutQuantity} 件待出库
                </p>
              </div>

              <div>
                <label className="label">出库数量</label>
                <input
                  type="number"
                  className="input"
                  min="1"
                  max={selectedBill.quantity - billOutQuantity}
                  value={stockOutForm.quantity}
                  onChange={(e) =>
                    setStockOutForm({
                      ...stockOutForm,
                      quantity: Math.max(
                        1,
                        Math.min(
                          selectedBill.quantity - billOutQuantity,
                          Number(e.target.value)
                        )
                      ),
                    })
                  }
                  required
                />
              </div>

              <div>
                <label className="label">去向</label>
                <input
                  type="text"
                  className="input"
                  value={stockOutForm.destination}
                  onChange={(e) =>
                    setStockOutForm({
                      ...stockOutForm,
                      destination: e.target.value,
                    })
                  }
                  placeholder="例如：朝阳区音乐培训中心"
                  required
                />
              </div>

              <div>
                <label className="label">接收人</label>
                <input
                  type="text"
                  className="input"
                  value={stockOutForm.receiver}
                  onChange={(e) =>
                    setStockOutForm({
                      ...stockOutForm,
                      receiver: e.target.value,
                    })
                  }
                  placeholder="请输入接收人姓名"
                  required
                />
              </div>

              <div>
                <label className="label">出库日期</label>
                <input
                  type="date"
                  className="input"
                  value={stockOutForm.outDate}
                  onChange={(e) =>
                    setStockOutForm({
                      ...stockOutForm,
                      outDate: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-sandalwood-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-gold-600" />
                  <span className="text-sandalwood-700">需要调律保养</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setStockOutForm({
                      ...stockOutForm,
                      needMaintenance: !stockOutForm.needMaintenance,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    stockOutForm.needMaintenance
                      ? 'bg-teal-500'
                      : 'bg-sandalwood-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      stockOutForm.needMaintenance
                        ? 'translate-x-6'
                        : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="label">备注</label>
                <textarea
                  className="input min-h-20"
                  value={stockOutForm.remark}
                  onChange={(e) =>
                    setStockOutForm({ ...stockOutForm, remark: e.target.value })
                  }
                  placeholder="可选，填写出库说明"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsStockOutModalOpen(false)}
                  className="btn btn-secondary flex-1"
                >
                  取消
                </button>
                <button type="submit" className="btn btn-teal flex-1">
                  确认出库
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FulfillmentSteps({
  bill,
  stockOuts,
  logs,
}: {
  bill: Bill;
  stockOuts: StockOut[];
  logs: BillFulfillmentLog[];
}) {
  const outQuantity = stockOuts.reduce((s, o) => s + o.quantity, 0);
  const revokedLogs = logs.filter((l) => l.type === 'revoke_out');
  const stockOutLogs = logs.filter((l) => l.type === 'stock_out');

  type FlowNode = {
    id: string;
    type: 'create' | 'stock_out' | 'revoke_out' | 'full_out' | 'cancel' | 'paid';
    title: string;
    subtitle?: string;
    date: string;
    quantity?: number;
    isCurrent: boolean;
    isDone: boolean;
    isCancelled?: boolean;
  };

  const nodes: FlowNode[] = [];
  const createLog = logs.find((l) => l.type === 'create');

  if (createLog || bill) {
    nodes.push({
      id: 'create',
      type: 'create',
      title: '创建账单',
      subtitle: `${bill.quantity} 件 ${bill.customerName}`,
      date: createLog?.createdAt || bill.createdAt,
      isCurrent: false,
      isDone: true,
    });
  }

  let runningQty = 0;
  const sortedOutLogs = [...stockOutLogs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  sortedOutLogs.forEach((log, idx) => {
    runningQty += log.quantity || 0;
    const isFull = runningQty >= bill.quantity;
    const isLast = idx === sortedOutLogs.length - 1;
    nodes.push({
      id: `out-${log.id}`,
      type: isFull && isLast ? 'full_out' : 'stock_out',
      title: isFull && isLast ? '全部出库' : `第 ${idx + 1} 次出库`,
      subtitle: isFull && isLast ? `${runningQty}/${bill.quantity} 件` : `${runningQty}/${bill.quantity} 件`,
      date: log.createdAt,
      quantity: log.quantity,
      isCurrent: false,
      isDone: true,
    });
  });

  if (stockOuts.length > 0 && stockOutLogs.length === 0) {
    stockOuts.forEach((out, idx) => {
      runningQty += out.quantity;
      const isFull = runningQty >= bill.quantity;
      const isLast = idx === stockOuts.length - 1;
      nodes.push({
        id: `out-hist-${out.id}`,
        type: isFull && isLast ? 'full_out' : 'stock_out',
        title: isFull && isLast ? '全部出库' : `第 ${idx + 1} 次出库`,
        subtitle: isFull && isLast ? `${runningQty}/${bill.quantity} 件` : `${runningQty}/${bill.quantity} 件`,
        date: out.outDate,
        quantity: out.quantity,
        isCurrent: false,
        isDone: true,
      });
    });
  }

  const sortedRevokeLogs = [...revokedLogs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  let revokedQty = 0;
  sortedRevokeLogs.forEach((log, idx) => {
    revokedQty += log.quantity || 0;
    runningQty -= log.quantity || 0;
    nodes.push({
      id: `revoke-${log.id}`,
      type: 'revoke_out',
      title: `第 ${idx + 1} 次撤回`,
      subtitle: `当前库存 ${Math.max(0, runningQty)} 件`,
      date: log.createdAt,
      quantity: log.quantity,
      isCurrent: false,
      isDone: true,
    });
  });

  const cancelLog = logs.find((l) => l.type === 'cancel');
  if (cancelLog) {
    nodes.push({
      id: 'cancel',
      type: 'cancel',
      title: '账单已取消',
      subtitle: cancelLog.remark,
      date: cancelLog.createdAt,
      quantity: cancelLog.quantity,
      isCurrent: false,
      isDone: true,
      isCancelled: true,
    });
  }

  const paidLog = logs.find((l) => l.type === 'mark_paid');
  if (paidLog || (!paidLog && bill.status === 'paid' && outQuantity >= bill.quantity)) {
    nodes.push({
      id: 'paid',
      type: 'paid',
      title: '已收款',
      subtitle: `¥${bill.finalAmount.toLocaleString()}`,
      date: paidLog?.createdAt || bill.createdAt,
      isCurrent: false,
      isDone: true,
    });
  }

  const hasPaidNode = nodes.some((n) => n.type === 'paid');
  const hasCancelNode = nodes.some((n) => n.type === 'cancel');

  if (nodes.length === 0) {
    nodes.push({
      id: 'pending',
      type: 'create',
      title: '待出库',
      subtitle: `${bill.quantity} 件 ${bill.customerName}`,
      date: bill.createdAt,
      isCurrent: true,
      isDone: false,
    });
  } else if (!hasCancelNode && !hasPaidNode) {
    if (nodes[nodes.length - 1].type !== 'full_out' || bill.status === 'unpaid') {
      if (outQuantity === 0) {
        nodes.push({
          id: 'pending-out',
          type: 'create',
          title: '待出库',
          subtitle: `${bill.quantity} 件待出库`,
          date: new Date().toISOString(),
          isCurrent: true,
          isDone: false,
        });
      } else if (outQuantity < bill.quantity) {
        nodes.push({
          id: 'pending-full',
          type: 'stock_out',
          title: '待全部出库',
          subtitle: `还需出 ${bill.quantity - outQuantity} 件`,
          date: new Date().toISOString(),
          isCurrent: true,
          isDone: false,
        });
      } else if (bill.status === 'unpaid') {
        nodes.push({
          id: 'pending-paid',
          type: 'paid',
          title: '待收款',
          subtitle: `¥${bill.finalAmount.toLocaleString()}`,
          date: new Date().toISOString(),
          isCurrent: true,
          isDone: false,
        });
      }
    }
  }

  if (nodes.length > 0) {
    nodes.forEach((n) => (n.isCurrent = false));
    const pendingIdx = nodes.findIndex((n) => !n.isDone);
    if (pendingIdx >= 0) {
      nodes[pendingIdx].isCurrent = true;
    } else if (nodes.length > 0) {
      nodes[nodes.length - 1].isCurrent = true;
    }
  }

  const getNodeStyle = (node: FlowNode) => {
    if (node.isCancelled) {
      return {
        dot: 'bg-red-500 text-white',
        line: 'bg-red-200',
        label: 'text-red-700',
      };
    }
    if (node.type === 'revoke_out') {
      return {
        dot: node.isCurrent
          ? 'bg-blue-500 text-white ring-4 ring-blue-100 scale-110'
          : node.isDone
          ? 'bg-blue-500 text-white'
          : 'bg-sandalwood-100 text-sandalwood-400',
        line: node.isDone ? 'bg-blue-300' : 'bg-sandalwood-100',
        label: node.isCurrent
          ? 'text-blue-700 font-semibold'
          : node.isDone
          ? 'text-blue-700'
          : 'text-sandalwood-400',
      };
    }
    if (node.type === 'paid') {
      return {
        dot: node.isCurrent
          ? 'bg-teal-500 text-white ring-4 ring-teal-100 scale-110'
          : node.isDone
          ? 'bg-teal-500 text-white'
          : 'bg-sandalwood-100 text-sandalwood-400',
        line: node.isDone ? 'bg-teal-300' : 'bg-sandalwood-100',
        label: node.isCurrent
          ? 'text-teal-700 font-semibold'
          : node.isDone
          ? 'text-teal-700'
          : 'text-sandalwood-400',
      };
    }
    if (node.type === 'cancel') {
      return {
        dot: node.isDone
          ? 'bg-red-500 text-white'
          : 'bg-sandalwood-100 text-sandalwood-400',
        line: 'bg-red-200',
        label: node.isDone ? 'text-red-700' : 'text-sandalwood-400',
      };
    }
    return {
      dot: node.isCurrent
        ? 'bg-gold-500 text-white ring-4 ring-gold-100 scale-110'
        : node.isDone
        ? 'bg-teal-500 text-white'
        : 'bg-sandalwood-100 text-sandalwood-400',
      line: node.isDone ? 'bg-teal-300' : 'bg-sandalwood-100',
      label: node.isCurrent
        ? 'text-gold-700 font-semibold'
        : node.isDone
        ? 'text-teal-700'
        : 'text-sandalwood-400',
    };
  };

  const getNodeIcon = (type: FlowNode['type']) => {
    switch (type) {
      case 'create':
        return FileText;
      case 'stock_out':
      case 'full_out':
        return PackageOpen;
      case 'revoke_out':
        return Undo2;
      case 'cancel':
        return X;
      case 'paid':
        return DollarSign;
    }
  };

  return (
    <div className="bg-sandalwood-50 rounded-xl p-4 border border-sandalwood-100">
      <div className="flex items-start gap-1 overflow-x-auto pb-2">
        {nodes.map((node, idx) => {
          const style = getNodeStyle(node);
          const Icon = getNodeIcon(node.type);
          const isLast = idx === nodes.length - 1;
          const isCancelledPath = nodes.some((n) => n.type === 'cancel') && idx > nodes.findIndex((n) => n.type === 'cancel');
          if (isCancelledPath) return null;

          return (
            <div key={node.id} className="flex items-start flex-shrink-0">
              <div className="flex flex-col items-center gap-1.5 min-w-[80px] md:min-w-[90px]">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-all ${style.dot}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-xs whitespace-nowrap text-center leading-tight ${style.label}`}>
                  {node.title}
                </span>
                {node.quantity !== undefined && node.type !== 'cancel' && (
                  <span className="text-[10px] text-sandalwood-500 -mt-0.5">
                    {node.type === 'revoke_out' ? '撤回 ' : '出 '}
                    <b className={node.type === 'revoke_out' ? 'text-blue-600' : 'text-sandalwood-700'}>
                      {node.type === 'revoke_out' ? '+' : ''}{node.quantity}
                    </b>
                    {node.type !== 'revoke_out' ? '件' : '件'}
                  </span>
                )}
                {node.subtitle && (
                  <span className="text-[10px] text-sandalwood-500 -mt-0.5 text-center leading-tight max-w-[90px]">
                    {node.subtitle}
                  </span>
                )}
                {node.isDone && !node.isCurrent && !node.isCancelled && (
                  <span className="text-[10px] text-sandalwood-400 -mt-0.5">
                    {new Date(node.date).toLocaleDateString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                    })}
                  </span>
                )}
                {node.isCurrent && (
                  <span className="text-[10px] text-gold-600 -mt-0.5">
                    当前
                  </span>
                )}
              </div>
              {!isLast && !nodes.some((n) => n.type === 'cancel' && nodes.indexOf(n) === idx) && (
                <div
                  className={`w-6 md:w-10 h-0.5 mx-0.5 md:mx-1 mt-5 ${style.line}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
