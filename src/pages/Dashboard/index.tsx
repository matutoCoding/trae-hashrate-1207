import { useState, useMemo } from 'react';
import {
  Package,
  DollarSign,
  FileText,
  Wrench,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Music,
  History,
  Download,
  Search,
  Filter,
  ChevronDown,
  X,
  Eye,
  BarChart3,
  ScrollText,
} from 'lucide-react';
import { useBatchStore } from '@/store/useBatchStore';
import { useBillStore } from '@/store/useBillStore';
import { useStockOutStore } from '@/store/useStockOutStore';
import { useMaintenanceStore } from '@/store/useMaintenanceStore';
import {
  useBatchTransactionStore,
  getTransactionTypeLabel,
} from '@/store/useBatchTransactionStore';
import {
  useBillFulfillmentStore,
  getFulfillmentTypeLabel,
} from '@/store/useBillFulfillmentStore';
import { formatCurrency } from '@/utils/pricing';
import { getTodayString, addDays } from '@/utils/date';
import { exportToCSV, formatDateTimeForExport } from '@/utils/export';
import { Link, useNavigate } from 'react-router-dom';
import type {
  Batch,
  BatchTransaction,
  BatchTransactionType,
  BillFulfillmentLog,
  BillFulfillmentType,
} from '@/types';

type DashboardTab = 'overview' | 'reconcile' | 'batchTx' | 'billLogs';

export default function Dashboard() {
  const navigate = useNavigate();
  const { getBatchesWithStatus, getWarningBatches, getExpiredBatches, getBatchById } =
    useBatchStore();
  const { bills, getTotalRevenue, getUnpaidBills } = useBillStore();
  const { stockOuts } = useStockOutStore();
  const { getPendingMaintenances } = useMaintenanceStore();
  const { getFilteredTransactions, transactions: allBatchTx } = useBatchTransactionStore();
  const { getFilteredLogs, logs: allBillLogs } = useBillFulfillmentStore();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [selectedReconcileBatch, setSelectedReconcileBatch] = useState<Batch | null>(null);

  const [batchTxFilter, setBatchTxFilter] = useState({
    startDate: addDays(getTodayString(), -30),
    endDate: getTodayString(),
    batchNo: '',
    types: [] as BatchTransactionType[],
  });
  const [billLogFilter, setBillLogFilter] = useState({
    startDate: addDays(getTodayString(), -30),
    endDate: getTodayString(),
    customerName: '',
    types: [] as BillFulfillmentType[],
  });

  const batches = getBatchesWithStatus();

  const totalInstruments = batches.reduce(
    (sum, b) => sum + b.totalQuantity,
    0
  );
  const availableInstruments = batches.reduce(
    (sum, b) => sum + b.remainingQuantity,
    0
  );
  const totalRevenue = getTotalRevenue();
  const unpaidBills = getUnpaidBills();
  const pendingMaintenances = getPendingMaintenances();
  const warningBatches = getWarningBatches();
  const expiredBatches = getExpiredBatches();

  const stats = [
    {
      label: '乐器总数',
      value: totalInstruments,
      unit: '件',
      icon: Package,
      color: 'bg-sandalwood-100 text-sandalwood-700',
      bgGradient: 'from-sandalwood-50 to-sandalwood-100',
    },
    {
      label: '可租赁数',
      value: availableInstruments,
      unit: '件',
      icon: Music,
      color: 'bg-teal-100 text-teal-700',
      bgGradient: 'from-teal-50 to-teal-100',
    },
    {
      label: '累计营收',
      value: formatCurrency(totalRevenue),
      unit: '',
      icon: DollarSign,
      color: 'bg-gold-100 text-gold-700',
      bgGradient: 'from-gold-50 to-gold-100',
    },
    {
      label: '未结账单',
      value: unpaidBills.length,
      unit: '笔',
      icon: FileText,
      color: 'bg-red-100 text-red-700',
      bgGradient: 'from-red-50 to-red-100',
    },
  ];

  const recentBills = bills.slice(0, 5);
  const recentStockOuts = stockOuts.slice(0, 5);

  const reconcileRows = useMemo(() => {
    return batches.map((batch) => {
      const txs = allBatchTx.filter((t) => t.batchId === batch.id);
      const editQty = txs
        .filter((t) => t.type === 'edit')
        .reduce((sum, t) => sum + t.quantityChange, 0);
      const outQty = txs
        .filter((t) => t.type === 'stock_out')
        .reduce((sum, t) => sum + t.quantityChange, 0);
      const revokeQty = txs
        .filter((t) => t.type === 'revoke_out')
        .reduce((sum, t) => sum + t.quantityChange, 0);
      const cancelQty = txs
        .filter((t) => t.type === 'bill_cancel')
        .reduce((sum, t) => sum + t.quantityChange, 0);
      const createTx = txs.find((t) => t.type === 'create');
      const openingQty = createTx ? createTx.remainingAfter : batch.totalQuantity;
      const expectedRemaining = openingQty + editQty + outQty + revokeQty + cancelQty;
      const diff = expectedRemaining - batch.remainingQuantity;
      return {
        batch,
        openingQty,
        editQty,
        outQty,
        revokeQty,
        cancelQty,
        expectedRemaining,
        actualRemaining: batch.remainingQuantity,
        diff,
      };
    });
  }, [batches, allBatchTx]);

  const filteredBatchTx = useMemo(
    () => getFilteredTransactions(batchTxFilter),
    [batchTxFilter, getFilteredTransactions]
  );
  const filteredBillLogs = useMemo(
    () => getFilteredLogs(billLogFilter),
    [billLogFilter, getFilteredLogs]
  );

  const handleExportBatchTx = () => {
    const rows = filteredBatchTx.map((tx) => {
      const b = getBatchById(tx.batchId);
      return {
        时间: formatDateTimeForExport(tx.createdAt),
        批号: b?.batchNo || tx.batchId,
        乐器名称: b?.instrumentName || '',
        操作类型: getTransactionTypeLabel(tx.type),
        数量变动_剩余: tx.quantityChange,
        数量变动_总量: tx.totalQuantityChange,
        剩余量_变动前: tx.remainingBefore,
        剩余量_变动后: tx.remainingAfter,
        总量_变动前: tx.totalBefore,
        总量_变动后: tx.totalAfter,
        备注: tx.remark,
        操作人: tx.operator,
        关联单号: tx.referenceId || '',
      };
    });
    exportToCSV(rows, `批次流水_${getTodayString()}.csv`);
  };

  const handleExportBillLogs = () => {
    const rows = filteredBillLogs.map((log) => {
      const bill = bills.find((b) => b.id === log.billId);
      return {
        时间: formatDateTimeForExport(log.createdAt),
        账单号: bill?.billNo || log.billId,
        客户名称: bill?.customerName || '',
        操作类型: getFulfillmentTypeLabel(log.type),
        数量: log.quantity,
        备注: log.remark,
        操作人: log.operator,
      };
    });
    exportToCSV(rows, `账单履约_${getTodayString()}.csv`);
  };

  const txTypeOptions: { value: BatchTransactionType; label: string }[] = [
    { value: 'create', label: '创建批次' },
    { value: 'edit', label: '编辑批次' },
    { value: 'stock_out', label: '出库' },
    { value: 'revoke_out', label: '撤回出库' },
    { value: 'bill_cancel', label: '账单取消' },
    { value: 'adjustment', label: '数量调整' },
  ];
  const logTypeOptions: { value: BillFulfillmentType; label: string }[] = [
    { value: 'create', label: '创建账单' },
    { value: 'stock_out', label: '出库' },
    { value: 'revoke_out', label: '撤回出库' },
    { value: 'cancel', label: '取消账单' },
    { value: 'mark_paid', label: '标记收款' },
  ];

  const toggleBatchTxType = (v: BatchTransactionType) => {
    setBatchTxFilter((f) => ({
      ...f,
      types: f.types.includes(v) ? f.types.filter((t) => t !== v) : [...f.types, v],
    }));
  };
  const toggleBillLogType = (v: BillFulfillmentType) => {
    setBillLogFilter((f) => ({
      ...f,
      types: f.types.includes(v) ? f.types.filter((t) => t !== v) : [...f.types, v],
    }));
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-sandalwood-900 mb-2">
          乐器租赁管理系统
        </h1>
        <p className="text-sandalwood-500">
          欢迎回来，今天是{' '}
          {new Date().toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {[
          { key: 'overview' as const, label: '首页总览', icon: BarChart3 },
          { key: 'reconcile' as const, label: '库存对账', icon: Search },
          { key: 'batchTx' as const, label: '批次流水', icon: ScrollText },
          { key: 'billLogs' as const, label: '账单履约', icon: History },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-sandalwood-800 text-white shadow-sm'
                : 'bg-sandalwood-50 text-sandalwood-600 hover:bg-sandalwood-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className={`card p-5 bg-gradient-to-br ${stat.bgGradient} border-none`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}
                  >
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-teal-500" />
                </div>
                <p className="text-sm text-sandalwood-600 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-sandalwood-900">
                  {stat.value}
                  <span className="text-sm font-normal text-sandalwood-500 ml-1">
                    {stat.unit}
                  </span>
                </p>
              </div>
            ))}
          </div>

          {(warningBatches.length > 0 ||
            expiredBatches.length > 0 ||
            pendingMaintenances.length > 0) && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-sandalwood-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-gold-500" />
                待办提醒
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {warningBatches.length > 0 && (
                  <div className="card p-4 border-l-4 border-l-gold-500 cursor-pointer hover:shadow-card-hover transition-all"
                    onClick={() => navigate('/batches')}>
                    <p className="text-sm text-sandalwood-600 mb-1">效期预警批次</p>
                    <p className="text-2xl font-bold text-gold-600">
                      {warningBatches.length} 批
                    </p>
                    <p className="text-xs text-sandalwood-400 mt-1">
                      30天内即将到期
                    </p>
                  </div>
                )}
                {expiredBatches.length > 0 && (
                  <div className="card p-4 border-l-4 border-l-red-500 cursor-pointer hover:shadow-card-hover transition-all"
                    onClick={() => navigate('/batches')}>
                    <p className="text-sm text-sandalwood-600 mb-1">已过期批次</p>
                    <p className="text-2xl font-bold text-red-600">
                      {expiredBatches.length} 批
                    </p>
                    <p className="text-xs text-sandalwood-400 mt-1">请及时处理</p>
                  </div>
                )}
                {pendingMaintenances.length > 0 && (
                  <div className="card p-4 border-l-4 border-l-teal-500 cursor-pointer hover:shadow-card-hover transition-all"
                    onClick={() => navigate('/maintenance')}>
                    <p className="text-sm text-sandalwood-600 mb-1">待保养任务</p>
                    <p className="text-2xl font-bold text-teal-600">
                      {pendingMaintenances.length} 项
                    </p>
                    <p className="text-xs text-sandalwood-400 mt-1">等待处理</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-sandalwood-900">
                  最近账单
                </h2>
                <Link
                  to="/bills"
                  className="text-sm text-gold-600 hover:text-gold-500 flex items-center gap-1"
                >
                  查看全部 <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="space-y-3">
                {recentBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between p-3 bg-sandalwood-50 rounded-lg hover:bg-sandalwood-100 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sandalwood-900">
                        {bill.billNo}
                      </p>
                      <p className="text-sm text-sandalwood-500">
                        {bill.customerName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sandalwood-900">
                        {formatCurrency(bill.finalAmount)}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          bill.status === 'paid'
                            ? 'bg-teal-100 text-teal-700'
                            : bill.status === 'unpaid'
                            ? 'bg-gold-100 text-gold-700'
                            : 'bg-sandalwood-100 text-sandalwood-600'
                        }`}
                      >
                        {bill.status === 'paid'
                          ? '已收款'
                          : bill.status === 'unpaid'
                          ? '待收款'
                          : '已取消'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-sandalwood-900">
                  最近出库
                </h2>
                <Link
                  to="/stock-out"
                  className="text-sm text-gold-600 hover:text-gold-500 flex items-center gap-1"
                >
                  查看全部 <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="space-y-3">
                {recentStockOuts.map((out) => {
                  const batch = useBatchStore
                    .getState()
                    .batches.find((b) => b.id === out.batchId);
                  return (
                    <div
                      key={out.id}
                      className="flex items-center justify-between p-3 bg-sandalwood-50 rounded-lg hover:bg-sandalwood-100 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sandalwood-900">
                          {batch?.instrumentName || '未知批次'}
                        </p>
                        <p className="text-sm text-sandalwood-500">
                          {out.destination}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sandalwood-900">
                          {out.quantity} 件
                        </p>
                        <p className="text-xs text-sandalwood-400">{out.outDate}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-sandalwood-900">
                库存概览
              </h2>
              <Link
                to="/batches"
                className="text-sm text-gold-600 hover:text-gold-500 flex items-center gap-1"
              >
                批次管理 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="text-center p-4 bg-sandalwood-50 rounded-lg"
                >
                  <div
                    className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
                      batch.status === 'normal'
                        ? 'bg-teal-100 text-teal-700'
                        : batch.status === 'warning'
                        ? 'bg-gold-100 text-gold-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    <Package className="w-6 h-6" />
                  </div>
                  <p className="font-medium text-sandalwood-900 text-sm truncate">
                    {batch.instrumentName}
                  </p>
                  <p className="text-lg font-bold text-sandalwood-900">
                    {batch.remainingQuantity}
                    <span className="text-sm font-normal text-sandalwood-400">
                      /{batch.totalQuantity}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'reconcile' && (
        <div className="card p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
            <h2 className="text-lg font-semibold text-sandalwood-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-gold-600" />
              库存对账看板
            </h2>
            <p className="text-sm text-sandalwood-500">
              期初 ± 本期变动 = 预期剩余，与实际剩余对比快速发现差异
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-sandalwood-50 text-sandalwood-600 text-xs uppercase">
                  <th className="px-3 py-2.5 text-left">批次/乐器</th>
                  <th className="px-3 py-2.5 text-right">期初数量</th>
                  <th className="px-3 py-2.5 text-right">编辑调整</th>
                  <th className="px-3 py-2.5 text-right">出库</th>
                  <th className="px-3 py-2.5 text-right">撤回</th>
                  <th className="px-3 py-2.5 text-right">账单取消</th>
                  <th className="px-3 py-2.5 text-right">预期剩余</th>
                  <th className="px-3 py-2.5 text-right">实际剩余</th>
                  <th className="px-3 py-2.5 text-right">差异</th>
                  <th className="px-3 py-2.5 text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {reconcileRows.map((row) => (
                  <tr
                    key={row.batch.id}
                    className="border-t border-sandalwood-100 hover:bg-sandalwood-50 transition-colors"
                  >
                    <td className="px-3 py-3">
                      <p className="font-medium text-sandalwood-900">
                        {row.batch.instrumentName}
                      </p>
                      <p className="text-xs text-sandalwood-500">
                        {row.batch.batchNo}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right text-sandalwood-700">
                      {row.openingQty}
                    </td>
                    <td className={`px-3 py-3 text-right ${row.editQty > 0 ? 'text-teal-600' : row.editQty < 0 ? 'text-red-600' : 'text-sandalwood-500'}`}>
                      {row.editQty > 0 ? '+' : ''}{row.editQty}
                    </td>
                    <td className="px-3 py-3 text-right text-gold-700">
                      {row.outQty}
                    </td>
                    <td className="px-3 py-3 text-right text-blue-600">
                      {row.revokeQty > 0 ? '+' : ''}{row.revokeQty}
                    </td>
                    <td className="px-3 py-3 text-right text-red-500">
                      {row.cancelQty > 0 ? '+' : ''}{row.cancelQty}
                    </td>
                    <td className="px-3 py-3 text-right text-sandalwood-600">
                      {row.expectedRemaining}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-sandalwood-900">
                      {row.actualRemaining}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.diff === 0
                          ? 'bg-teal-50 text-teal-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {row.diff === 0 ? '✓ 平账' : `差异 ${row.diff}`}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => setSelectedReconcileBatch(row.batch)}
                        className="text-sandalwood-500 hover:text-sandalwood-800 p-1 inline-flex items-center gap-1 text-xs"
                      >
                        <Eye className="w-4 h-4" />
                        流水
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'batchTx' && (
        <div className="card p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
            <h2 className="text-lg font-semibold text-sandalwood-900 flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-sandalwood-700" />
              批次流水
            </h2>
            <button
              onClick={handleExportBatchTx}
              className="btn btn-teal text-sm gap-1 py-1.5 self-end"
            >
              <Download className="w-4 h-4" />
              导出CSV
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="text-xs text-sandalwood-500 mb-1 block">开始日期</label>
              <input
                type="date"
                className="input text-sm py-2"
                value={batchTxFilter.startDate}
                onChange={(e) =>
                  setBatchTxFilter({ ...batchTxFilter, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-sandalwood-500 mb-1 block">结束日期</label>
              <input
                type="date"
                className="input text-sm py-2"
                value={batchTxFilter.endDate}
                onChange={(e) =>
                  setBatchTxFilter({ ...batchTxFilter, endDate: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-sandalwood-500 mb-1 block">批号/乐器名称</label>
              <input
                type="text"
                className="input text-sm py-2"
                placeholder="输入批号或乐器名称搜索"
                value={batchTxFilter.batchNo}
                onChange={(e) =>
                  setBatchTxFilter({ ...batchTxFilter, batchNo: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {txTypeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleBatchTxType(opt.value)}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  batchTxFilter.types.includes(opt.value)
                    ? 'bg-sandalwood-800 text-white'
                    : 'bg-sandalwood-100 text-sandalwood-600 hover:bg-sandalwood-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredBatchTx.length === 0 ? (
              <p className="text-sm text-sandalwood-400 text-center py-8">
                暂无符合条件的流水
              </p>
            ) : (
              filteredBatchTx.map((tx) => {
                const b = getBatchById(tx.batchId);
                const colorMap: Record<BatchTransactionType, string> = {
                  create: 'border-l-teal-500 bg-teal-50',
                  edit: 'border-l-sandalwood-500 bg-sandalwood-50',
                  stock_out: 'border-l-gold-500 bg-gold-50',
                  revoke_out: 'border-l-blue-500 bg-blue-50',
                  bill_cancel: 'border-l-red-500 bg-red-50',
                  adjustment: 'border-l-purple-500 bg-purple-50',
                };
                return (
                  <div
                    key={tx.id}
                    className={`p-3 rounded-lg border-l-4 ${colorMap[tx.type]}`}
                  >
                    <div className="flex items-start justify-between mb-1 gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-sandalwood-700 px-2 py-0.5 bg-white/70 rounded-full">
                          {getTransactionTypeLabel(tx.type)}
                        </span>
                        <span className="text-sm font-medium text-sandalwood-900">
                          {b?.instrumentName || '未知批次'}
                        </span>
                        <span className="text-xs text-sandalwood-500">
                          {b?.batchNo}
                        </span>
                      </div>
                      <span className="text-xs text-sandalwood-500">
                        {formatDateTimeForExport(tx.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-sandalwood-600 flex-wrap">
                      <span>
                        剩余量: <b>{tx.remainingBefore}</b> → <b className={tx.quantityChange >= 0 ? 'text-teal-700' : 'text-red-700'}>{tx.remainingAfter}</b>
                        {tx.quantityChange !== 0 && (
                          <span className={tx.quantityChange > 0 ? 'text-teal-600 ml-1' : 'text-red-600 ml-1'}>
                            ({tx.quantityChange > 0 ? '+' : ''}{tx.quantityChange})
                          </span>
                        )}
                      </span>
                      <span>
                        总量: {tx.totalBefore} → {tx.totalAfter}
                      </span>
                    </div>
                    {tx.remark && (
                      <p className="text-xs text-sandalwood-500 mt-1">{tx.remark}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <p className="text-xs text-sandalwood-400 mt-3 text-right">
            共 {filteredBatchTx.length} 条记录
          </p>
        </div>
      )}

      {activeTab === 'billLogs' && (
        <div className="card p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
            <h2 className="text-lg font-semibold text-sandalwood-900 flex items-center gap-2">
              <History className="w-5 h-5 text-sandalwood-700" />
              账单履约日志
            </h2>
            <button
              onClick={handleExportBillLogs}
              className="btn btn-teal text-sm gap-1 py-1.5 self-end"
            >
              <Download className="w-4 h-4" />
              导出CSV
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs text-sandalwood-500 mb-1 block">开始日期</label>
              <input
                type="date"
                className="input text-sm py-2"
                value={billLogFilter.startDate}
                onChange={(e) =>
                  setBillLogFilter({ ...billLogFilter, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-sandalwood-500 mb-1 block">结束日期</label>
              <input
                type="date"
                className="input text-sm py-2"
                value={billLogFilter.endDate}
                onChange={(e) =>
                  setBillLogFilter({ ...billLogFilter, endDate: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs text-sandalwood-500 mb-1 block">客户/账单号</label>
              <input
                type="text"
                className="input text-sm py-2"
                placeholder="输入客户名或账单号搜索"
                value={billLogFilter.customerName}
                onChange={(e) =>
                  setBillLogFilter({ ...billLogFilter, customerName: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {logTypeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleBillLogType(opt.value)}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  billLogFilter.types.includes(opt.value)
                    ? 'bg-sandalwood-800 text-white'
                    : 'bg-sandalwood-100 text-sandalwood-600 hover:bg-sandalwood-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredBillLogs.length === 0 ? (
              <p className="text-sm text-sandalwood-400 text-center py-8">
                暂无符合条件的履约日志
              </p>
            ) : (
              filteredBillLogs.map((log) => {
                const bill = bills.find((b) => b.id === log.billId);
                const colorMap: Record<BillFulfillmentType, string> = {
                  create: 'border-l-teal-500 bg-teal-50',
                  stock_out: 'border-l-gold-500 bg-gold-50',
                  revoke_out: 'border-l-blue-500 bg-blue-50',
                  cancel: 'border-l-red-500 bg-red-50',
                  mark_paid: 'border-l-emerald-500 bg-emerald-50',
                };
                return (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border-l-4 ${colorMap[log.type]}`}
                  >
                    <div className="flex items-start justify-between mb-1 gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-sandalwood-700 px-2 py-0.5 bg-white/70 rounded-full">
                          {getFulfillmentTypeLabel(log.type)}
                        </span>
                        <span className="text-sm font-medium text-sandalwood-900">
                          {bill?.billNo || log.billId}
                        </span>
                        <span className="text-xs text-sandalwood-500">
                          {bill?.customerName}
                        </span>
                        {log.quantity > 0 && (
                          <span className="text-xs font-semibold text-sandalwood-800 bg-white/80 px-2 py-0.5 rounded-full">
                            {log.quantity} 件
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-sandalwood-500">
                        {formatDateTimeForExport(log.createdAt)}
                      </span>
                    </div>
                    {log.remark && (
                      <p className="text-xs text-sandalwood-500">{log.remark}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <p className="text-xs text-sandalwood-400 mt-3 text-right">
            共 {filteredBillLogs.length} 条记录
          </p>
        </div>
      )}

      {selectedReconcileBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-5 border-b border-sandalwood-100 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-serif font-bold text-sandalwood-900">
                  {selectedReconcileBatch.instrumentName}
                </h3>
                <p className="text-xs text-sandalwood-500">
                  {selectedReconcileBatch.batchNo} · 流水明细
                </p>
              </div>
              <button
                onClick={() => setSelectedReconcileBatch(null)}
                className="text-sandalwood-400 hover:text-sandalwood-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <BatchTransactionList batchId={selectedReconcileBatch.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BatchTransactionList({ batchId }: { batchId: string }) {
  const { getTransactionsByBatch } = useBatchTransactionStore();
  const txs = getTransactionsByBatch(batchId);
  if (txs.length === 0) {
    return <p className="text-sm text-sandalwood-400 text-center py-8">暂无流水记录</p>;
  }
  const colorMap: Record<BatchTransactionType, string> = {
    create: 'border-l-teal-500 bg-teal-50',
    edit: 'border-l-sandalwood-500 bg-sandalwood-50',
    stock_out: 'border-l-gold-500 bg-gold-50',
    revoke_out: 'border-l-blue-500 bg-blue-50',
    bill_cancel: 'border-l-red-500 bg-red-50',
    adjustment: 'border-l-purple-500 bg-purple-50',
  };
  return (
    <div className="space-y-2">
      {txs.map((tx) => (
        <div
          key={tx.id}
          className={`p-3 rounded-lg border-l-4 ${colorMap[tx.type]}`}
        >
          <div className="flex items-start justify-between mb-1 gap-2 flex-wrap">
            <span className="text-xs font-semibold text-sandalwood-700 px-2 py-0.5 bg-white/70 rounded-full">
              {getTransactionTypeLabel(tx.type)}
            </span>
            <span className="text-xs text-sandalwood-500">
              {formatDateTimeForExport(tx.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-sandalwood-600 flex-wrap">
            <span>
              剩余: <b>{tx.remainingBefore}</b> → <b>{tx.remainingAfter}</b>
              {tx.quantityChange !== 0 && (
                <span className={tx.quantityChange > 0 ? 'text-teal-600 ml-1' : 'text-red-600 ml-1'}>
                  ({tx.quantityChange > 0 ? '+' : ''}{tx.quantityChange})
                </span>
              )}
            </span>
            <span>
              总量: {tx.totalBefore} → {tx.totalAfter}
            </span>
          </div>
          {tx.remark && <p className="text-xs text-sandalwood-500 mt-1">{tx.remark}</p>}
          <p className="text-xs text-sandalwood-400 mt-1">操作人: {tx.operator}</p>
        </div>
      ))}
    </div>
  );
}
