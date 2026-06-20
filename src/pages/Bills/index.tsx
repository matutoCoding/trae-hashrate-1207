import { useState } from 'react';
import {
  Plus,
  Eye,
  Search,
  Filter,
  ChevronDown,
  X,
  FileText,
  Calendar,
  User,
  Music,
  Tag,
} from 'lucide-react';
import { useBillStore } from '@/store/useBillStore';
import { useBatchStore } from '@/store/useBatchStore';
import { useBillingRuleStore } from '@/store/useBillingRuleStore';
import { formatCurrency, getPricingTypeLabel } from '@/utils/pricing';
import { calculateDays, getTodayString } from '@/utils/date';
import type { Bill } from '@/types';

export default function Bills() {
  const { bills, addBill, updateBillStatus, getBillById } = useBillStore();
  const { batches } = useBatchStore();
  const { getActiveRules } = useBillingRuleStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    batchId: '',
    ruleId: '',
    customerName: '',
    quantity: 1,
    startDate: getTodayString(),
    endDate: getTodayString(),
  });

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

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rule = getActiveRules().find((r) => r.id === formData.ruleId);
    if (!rule) return;

    const rentalDays = calculateDays(formData.startDate, formData.endDate);
    const basePerUnit = rule.dailyRate * rentalDays;
    let finalPerUnit = basePerUnit;
    let pricingType: Bill['pricingType'] = 'normal';

    if (basePerUnit < rule.startingPrice) {
      finalPerUnit = rule.startingPrice;
      pricingType = 'starting';
    } else if (basePerUnit > rule.capPrice) {
      finalPerUnit = rule.capPrice;
      pricingType = 'cap';
    }

    addBill({
      ...formData,
      dailyRate: rule.dailyRate,
      startingPrice: rule.startingPrice,
      capPrice: rule.capPrice,
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
  };

  const viewBillDetail = (bill: Bill) => {
    setSelectedBill(bill);
  };

  const activeRules = getActiveRules();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-sandalwood-900 mb-1">
            账单管理
          </h1>
          <p className="text-sandalwood-500 text-sm">
            查看和管理所有租赁账单
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
          const batch = batches.find((b) => b.id === bill.batchId);
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
                  <span className="text-sandalwood-600">{bill.customerName}</span>
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
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
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

            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-sandalwood-500">账单号</p>
                  <p className="text-lg font-semibold text-sandalwood-900">
                    {selectedBill.billNo}
                  </p>
                </div>
                {getStatusBadge(selectedBill.status)}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-sandalwood-50 rounded-lg p-3">
                    <p className="text-xs text-sandalwood-500 mb-1">客户名称</p>
                    <p className="font-medium text-sandalwood-900">
                      {selectedBill.customerName}
                    </p>
                  </div>
                  <div className="bg-sandalwood-50 rounded-lg p-3">
                    <p className="text-xs text-sandalwood-500 mb-1">租赁数量</p>
                    <p className="font-medium text-sandalwood-900">
                      {selectedBill.quantity} 件
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

                <div className="bg-gold-50 rounded-xl p-4 border border-gold-100">
                  <h3 className="font-medium text-gold-800 mb-3">费用明细</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gold-600">日租金 × 数量 × 天数</span>
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
              </div>

              {selectedBill.status === 'unpaid' && (
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      updateBillStatus(selectedBill.id, 'cancelled');
                      const updated = getBillById(selectedBill.id);
                      if (updated) setSelectedBill(updated);
                    }}
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
                  onChange={(e) =>
                    setFormData({ ...formData, batchId: e.target.value })
                  }
                  required
                >
                  <option value="">请选择乐器批次</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.instrumentName} ({batch.batchNo}) - 剩余
                      {batch.remainingQuantity}件
                    </option>
                  ))}
                </select>
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
                  {activeRules.map((rule) => (
                    <option key={rule.id} value={rule.id}>
                      {rule.name} - {formatCurrency(rule.dailyRate)}/天
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
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: Number(e.target.value),
                    })
                  }
                  required
                />
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
                    className="input"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-secondary flex-1"
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  创建账单
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
