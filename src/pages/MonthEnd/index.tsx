import { useState, useMemo } from 'react';
import {
  DollarSign,
  XCircle,
  RotateCcw,
  AlertTriangle,
  Download,
  Users,
  FileText,
  Package,
  ArrowLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBillStore } from '@/store/useBillStore';
import { useBatchStore } from '@/store/useBatchStore';
import { useStockOutStore } from '@/store/useStockOutStore';
import { useBatchTransactionStore } from '@/store/useBatchTransactionStore';
import { useBillingRuleStore } from '@/store/useBillingRuleStore';
import { exportToCSV, formatDateTimeForExport } from '@/utils/export';
import { formatDate } from '@/utils/date';
import type { Bill } from '@/types';

export default function MonthEnd() {
  const navigate = useNavigate();
  const { bills } = useBillStore();
  const { batches } = useBatchStore();
  const { stockOuts } = useStockOutStore();
  const { transactions: allBatchTx } = useBatchTransactionStore();
  const { getRuleById } = useBillingRuleStore();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [activeTab, setActiveTab] = useState<'customer' | 'bill' | 'batch'>('customer');

  const getMonthStr = (dateStr: string) => dateStr.slice(0, 7);

  const monthData = useMemo(() => {
    const monthBills = bills.filter((b) => getMonthStr(b.createdAt) === selectedMonth);

    const totalRevenue = monthBills
      .filter((b) => b.status === 'paid')
      .reduce((s, b) => s + b.finalAmount, 0);
    const totalUnpaid = monthBills
      .filter((b) => b.status === 'unpaid')
      .reduce((s, b) => s + b.finalAmount, 0);

    const monthTx = allBatchTx.filter((t) => getMonthStr(t.createdAt) === selectedMonth);
    const totalRestoredQty = monthTx
      .filter((t) => t.type === 'bill_cancel' || t.type === 'revoke_out')
      .reduce((s, t) => s + Math.abs(t.quantityChange), 0);

    const monthReconcile = batches.map((batch) => {
      const txs = allBatchTx.filter(
        (t) => t.batchId === batch.id && getMonthStr(t.createdAt) === selectedMonth
      );
      const editQty = txs.filter((t) => t.type === 'edit').reduce((s, t) => s + t.quantityChange, 0);
      const txOutQty = txs.filter((t) => t.type === 'stock_out').reduce((s, t) => s + t.quantityChange, 0);
      const txRevokeQty = txs.filter((t) => t.type === 'revoke_out').reduce((s, t) => s + t.quantityChange, 0);
      const txCancelQty = txs.filter((t) => t.type === 'bill_cancel').reduce((s, t) => s + t.quantityChange, 0);

      const actualStockOuts = useStockOutStore
        .getState()
        .getStockOutsByBatch(batch.id)
        .filter((o) => getMonthStr(o.outDate) === selectedMonth);
      const totalOutFromRecords = actualStockOuts.reduce((s, o) => s + o.quantity, 0);
      const outQty = -Math.max(totalOutFromRecords, Math.abs(txOutQty));
      const revokeQty = txRevokeQty + txCancelQty;

      const createTx = txs.find((t) => t.type === 'create');
      const openingQty = createTx ? createTx.remainingAfter : batch.totalQuantity;
      const expectedRemaining = openingQty + editQty + outQty + revokeQty;
      const diff = expectedRemaining - batch.remainingQuantity;

      return { batch, diff };
    });
    const totalDiff = monthReconcile.reduce((s, r) => s + Math.abs(r.diff), 0);

    const customerSummary = new Map<string, {
      customerName: string;
      billCount: number;
      totalAmount: number;
      paidAmount: number;
      unpaidAmount: number;
      bills: Bill[];
    }>();
    monthBills.forEach((bill) => {
      const key = bill.customerName;
      if (!customerSummary.has(key)) {
        customerSummary.set(key, {
          customerName: key,
          billCount: 0,
          totalAmount: 0,
          paidAmount: 0,
          unpaidAmount: 0,
          bills: [],
        });
      }
      const cs = customerSummary.get(key)!;
      cs.billCount++;
      cs.totalAmount += bill.finalAmount;
      if (bill.status === 'paid') cs.paidAmount += bill.finalAmount;
      if (bill.status === 'unpaid') cs.unpaidAmount += bill.finalAmount;
      cs.bills.push(bill);
    });

    const batchSummary = new Map<string, {
      batchId: string;
      batchNo: string;
      instrumentName: string;
      outQty: number;
      revokeQty: number;
      cancelQty: number;
      editQty: number;
      diff: number;
    }>();
    monthReconcile.forEach((r) => {
      const txs = allBatchTx.filter(
        (t) => t.batchId === r.batch.id && getMonthStr(t.createdAt) === selectedMonth
      );
      const actualOuts = stockOuts.filter(
        (o) => o.batchId === r.batch.id && getMonthStr(o.outDate) === selectedMonth
      );
      const totalOutQty = actualOuts.reduce((s, o) => s + o.quantity, 0);
      const txRevokeQty = txs.filter((t) => t.type === 'revoke_out').reduce((s, t) => s + Math.abs(t.quantityChange), 0);
      const txCancelQty = txs.filter((t) => t.type === 'bill_cancel').reduce((s, t) => s + Math.abs(t.quantityChange), 0);
      const txEditQty = txs.filter((t) => t.type === 'edit').reduce((s, t) => s + t.quantityChange, 0);

      batchSummary.set(r.batch.id, {
        batchId: r.batch.id,
        batchNo: r.batch.batchNo,
        instrumentName: r.batch.instrumentName,
        outQty: totalOutQty,
        revokeQty: txRevokeQty,
        cancelQty: txCancelQty,
        editQty: txEditQty,
        diff: r.diff,
      });
    });

    return {
      monthBills,
      totalRevenue,
      totalUnpaid,
      totalRestoredQty,
      totalDiff,
      customerSummary: Array.from(customerSummary.values()),
      batchSummary: Array.from(batchSummary.values()),
    };
  }, [bills, batches, allBatchTx, selectedMonth, stockOuts]);

  const handleExportCustomer = () => {
    const rows = monthData.customerSummary.map((c) => ({
      客户名称: c.customerName,
      账单数量: c.billCount,
      租赁总额: c.totalAmount,
      已收款: c.paidAmount,
      未收款: c.unpaidAmount,
    }));
    exportToCSV(rows, `月结-客户汇总-${selectedMonth}.csv`);
  };

  const handleExportBill = () => {
    const rows = monthData.monthBills.map((b) => {
      const rule = getRuleById(b.ruleId);
      const batch = batches.find((ba) => ba.id === b.batchId);
      return {
        账单号: b.billNo,
        客户名称: b.customerName,
        乐器: batch?.instrumentName || '',
        批次: batch?.batchNo || '',
        计费规则: rule?.name || '',
        租赁数量: b.quantity,
        租期: `${b.startDate} 至 ${b.endDate} (${b.rentalDays}天)`,
        计费方式: b.pricingType === 'starting' ? '起步价' : b.pricingType === 'cap' ? '封顶价' : '标准价',
        应收金额: b.finalAmount,
        状态: b.status === 'paid' ? '已收款' : b.status === 'unpaid' ? '未收款' : '已取消',
        创建时间: formatDateTimeForExport(b.createdAt),
      };
    });
    exportToCSV(rows, `月结-账单明细-${selectedMonth}.csv`);
  };

  const handleExportBatch = () => {
    const rows = monthData.batchSummary.map((b) => ({
      批号: b.batchNo,
      乐器名称: b.instrumentName,
      本月出库: b.outQty,
      本月撤回: b.revokeQty,
      本月取消恢复: b.cancelQty,
      本月编辑调整: b.editQty,
      数量差异: b.diff,
    }));
    exportToCSV(rows, `月结-批次汇总-${selectedMonth}.csv`);
  };

  const handleExportAll = () => {
    handleExportCustomer();
    setTimeout(() => handleExportBill(), 200);
    setTimeout(() => handleExportBatch(), 400);
  };

  const months = useMemo(() => {
    const set = new Set<string>();
    bills.forEach((b) => set.add(getMonthStr(b.createdAt)));
    allBatchTx.forEach((t) => set.add(getMonthStr(t.createdAt)));
    set.add(selectedMonth);
    return Array.from(set).sort().reverse();
  }, [bills, allBatchTx, selectedMonth]);

  const tabs = [
    { key: 'customer' as const, label: '客户汇总', icon: Users },
    { key: 'bill' as const, label: '账单明细', icon: FileText },
    { key: 'batch' as const, label: '批次汇总', icon: Package },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-sandalwood-500 hover:text-sandalwood-800 p-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-serif font-bold text-sandalwood-900">月结对账</h1>
            <p className="text-sm text-sandalwood-500">按月份核收租赁收入、出库和库存差异</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input text-sm py-2 w-36"
          >
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button
            onClick={handleExportAll}
            className="btn btn-teal text-sm gap-1 py-2"
          >
            <Download className="w-4 h-4" />
            导出全部
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <p className="text-sm text-sandalwood-500">本月租赁收入</p>
          </div>
          <p className="text-2xl font-bold text-teal-700">¥{monthData.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-gold-100 text-gold-700 flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
            <p className="text-sm text-sandalwood-500">本月未收款</p>
          </div>
          <p className="text-2xl font-bold text-gold-700">¥{monthData.totalUnpaid.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <p className="text-sm text-sandalwood-500">库存恢复数量</p>
          </div>
          <p className="text-2xl font-bold text-blue-700">{monthData.totalRestoredQty} 件</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
              monthData.totalDiff === 0 ? 'bg-teal-100 text-teal-700' : 'bg-red-100 text-red-700'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <p className="text-sm text-sandalwood-500">库存差异合计</p>
          </div>
          <p className={`text-2xl font-bold ${
            monthData.totalDiff === 0 ? 'text-teal-700' : 'text-red-700'
          }`}>
            {monthData.totalDiff === 0 ? '✓ 平账' : `${monthData.totalDiff} 件`}
          </p>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.key
                      ? 'bg-sandalwood-800 text-white'
                      : 'bg-sandalwood-50 text-sandalwood-600 hover:bg-sandalwood-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          {activeTab === 'customer' && (
            <button onClick={handleExportCustomer} className="btn btn-teal text-sm gap-1 py-1.5 self-end">
              <Download className="w-4 h-4" />
              导出客户CSV
            </button>
          )}
          {activeTab === 'bill' && (
            <button onClick={handleExportBill} className="btn btn-teal text-sm gap-1 py-1.5 self-end">
              <Download className="w-4 h-4" />
              导出账单CSV
            </button>
          )}
          {activeTab === 'batch' && (
            <button onClick={handleExportBatch} className="btn btn-teal text-sm gap-1 py-1.5 self-end">
              <Download className="w-4 h-4" />
              导出批次CSV
            </button>
          )}
        </div>

        {activeTab === 'customer' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-sandalwood-50 text-sandalwood-600 text-xs uppercase">
                  <th className="px-3 py-2.5 text-left">客户名称</th>
                  <th className="px-3 py-2.5 text-right">账单数</th>
                  <th className="px-3 py-2.5 text-right">租赁总额</th>
                  <th className="px-3 py-2.5 text-right">已收款</th>
                  <th className="px-3 py-2.5 text-right">未收款</th>
                </tr>
              </thead>
              <tbody>
                {monthData.customerSummary.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-sandalwood-400">
                      本月暂无客户数据
                    </td>
                  </tr>
                ) : (
                  monthData.customerSummary.map((c) => (
                    <tr
                      key={c.customerName}
                      className="border-t border-sandalwood-100 hover:bg-sandalwood-50 transition-colors"
                    >
                      <td className="px-3 py-3 font-medium text-sandalwood-900">
                        {c.customerName}
                      </td>
                      <td className="px-3 py-3 text-right text-sandalwood-700">{c.billCount}</td>
                      <td className="px-3 py-3 text-right text-sandalwood-700">
                        ¥{c.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right text-teal-700 font-medium">
                        ¥{c.paidAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className={c.unpaidAmount > 0 ? 'text-gold-700 font-medium' : 'text-sandalwood-400'}>
                          {c.unpaidAmount > 0 ? `¥${c.unpaidAmount.toLocaleString()}` : '-'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'bill' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-sandalwood-50 text-sandalwood-600 text-xs uppercase">
                  <th className="px-3 py-2.5 text-left">账单号</th>
                  <th className="px-3 py-2.5 text-left">客户</th>
                  <th className="px-3 py-2.5 text-left">乐器</th>
                  <th className="px-3 py-2.5 text-right">数量</th>
                  <th className="px-3 py-2.5 text-left">租期</th>
                  <th className="px-3 py-2.5 text-right">应收</th>
                  <th className="px-3 py-2.5 text-center">状态</th>
                </tr>
              </thead>
              <tbody>
                {monthData.monthBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-sandalwood-400">
                      本月暂无账单
                    </td>
                  </tr>
                ) : (
                  monthData.monthBills.map((b) => (
                    <tr
                      key={b.id}
                      className="border-t border-sandalwood-100 hover:bg-sandalwood-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/bills?billId=${b.id}`)}
                    >
                      <td className="px-3 py-3 font-medium text-sandalwood-900">{b.billNo}</td>
                      <td className="px-3 py-3 text-sandalwood-700">{b.customerName}</td>
                      <td className="px-3 py-3 text-sandalwood-600">
                        {batches.find((ba) => ba.id === b.batchId)?.instrumentName}
                      </td>
                      <td className="px-3 py-3 text-right text-sandalwood-700">{b.quantity}</td>
                      <td className="px-3 py-3 text-sandalwood-600 text-xs">
                        {formatDate(b.startDate)} ~ {formatDate(b.endDate)}
                        <br />
                        <span className="text-sandalwood-400">{b.rentalDays}天</span>
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-sandalwood-900">
                        ¥{b.finalAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          b.status === 'paid'
                            ? 'bg-teal-50 text-teal-700'
                            : b.status === 'unpaid'
                            ? 'bg-gold-50 text-gold-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {b.status === 'paid' ? '已收款' : b.status === 'unpaid' ? '未收款' : '已取消'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'batch' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-sandalwood-50 text-sandalwood-600 text-xs uppercase">
                  <th className="px-3 py-2.5 text-left">批号/乐器</th>
                  <th className="px-3 py-2.5 text-right">本月出库</th>
                  <th className="px-3 py-2.5 text-right">本月撤回</th>
                  <th className="px-3 py-2.5 text-right">取消恢复</th>
                  <th className="px-3 py-2.5 text-right">编辑调整</th>
                  <th className="px-3 py-2.5 text-right">差异</th>
                </tr>
              </thead>
              <tbody>
                {monthData.batchSummary.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sandalwood-400">
                      本月暂无批次数据
                    </td>
                  </tr>
                ) : (
                  monthData.batchSummary.map((b) => (
                    <tr
                      key={b.batchId}
                      className="border-t border-sandalwood-100 hover:bg-sandalwood-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/batches?batchId=${b.batchId}`)}
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium text-sandalwood-900">{b.instrumentName}</p>
                        <p className="text-xs text-sandalwood-500">{b.batchNo}</p>
                      </td>
                      <td className="px-3 py-3 text-right text-gold-700">-{b.outQty}</td>
                      <td className="px-3 py-3 text-right text-blue-600">+{b.revokeQty}</td>
                      <td className="px-3 py-3 text-right text-red-500">+{b.cancelQty}</td>
                      <td className={`px-3 py-3 text-right ${b.editQty > 0 ? 'text-teal-600' : b.editQty < 0 ? 'text-red-600' : 'text-sandalwood-500'}`}>
                        {b.editQty > 0 ? '+' : ''}{b.editQty}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          b.diff === 0
                            ? 'bg-teal-50 text-teal-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {b.diff === 0 ? '✓ 平账' : `差异 ${b.diff}`}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
