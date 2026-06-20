import {
  Package,
  DollarSign,
  FileText,
  Wrench,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Music,
} from 'lucide-react';
import { useBatchStore } from '@/store/useBatchStore';
import { useBillStore } from '@/store/useBillStore';
import { useStockOutStore } from '@/store/useStockOutStore';
import { useMaintenanceStore } from '@/store/useMaintenanceStore';
import { formatCurrency } from '@/utils/pricing';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { batches, getWarningBatches, getExpiredBatches } = useBatchStore();
  const { bills, getTotalRevenue, getUnpaidBills } = useBillStore();
  const { stockOuts } = useStockOutStore();
  const { getPendingMaintenances } = useMaintenanceStore();

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

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
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
              <div className="card p-4 border-l-4 border-l-gold-500">
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
              <div className="card p-4 border-l-4 border-l-red-500">
                <p className="text-sm text-sandalwood-600 mb-1">已过期批次</p>
                <p className="text-2xl font-bold text-red-600">
                  {expiredBatches.length} 批
                </p>
                <p className="text-xs text-sandalwood-400 mt-1">请及时处理</p>
              </div>
            )}
            {pendingMaintenances.length > 0 && (
              <div className="card p-4 border-l-4 border-l-teal-500">
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
    </div>
  );
}
