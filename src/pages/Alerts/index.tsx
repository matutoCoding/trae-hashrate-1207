import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  DollarSign,
  XCircle,
  AlertTriangle,
  FileText,
  Package,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBillStore } from '@/store/useBillStore';
import { useBatchStore } from '@/store/useBatchStore';
import { useStockOutStore } from '@/store/useStockOutStore';
import { useBatchTransactionStore } from '@/store/useBatchTransactionStore';
import { formatDate } from '@/utils/date';
import { getDaysUntilExpiry } from '@/utils/date';

type AlertType = 'paid_not_full_out' | 'cancelled_not_restored' | 'batch_mismatch' | 'unpaid_overdue';

interface AlertItem {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  action: { label: string; onClick: () => void };
  metadata: Record<string, any>;
}

export default function Alerts() {
  const navigate = useNavigate();
  const { bills } = useBillStore();
  const { batches, getBatchById } = useBatchStore();
  const { stockOuts, getStockOutsByBatch } = useStockOutStore();
  const { transactions: allBatchTx } = useBatchTransactionStore();

  const [activeType, setActiveType] = useState<AlertType | 'all'>('all');

  const alerts = useMemo<AlertItem[]>(() => {
    const result: AlertItem[] = [];

    // 1. 已收款但未全部出库
    bills
      .filter((b) => b.status === 'paid')
      .forEach((bill) => {
        const billOuts = stockOuts.filter((o) => o.billId === bill.id);
        const totalOut = billOuts.reduce((s, o) => s + o.quantity, 0);
        if (totalOut < bill.quantity) {
          result.push({
            id: `paid-${bill.id}`,
            type: 'paid_not_full_out',
            title: `账单 ${bill.billNo} 已收款但未全部出库`,
            description: `客户 ${bill.customerName}，应出 ${bill.quantity} 件，实出 ${totalOut} 件，还差 ${bill.quantity - totalOut} 件`,
            severity: 'high',
            action: {
              label: '查看账单',
              onClick: () => navigate(`/bills?billId=${bill.id}`),
            },
            metadata: { bill, totalOut },
          });
        }
      });

    // 2. 已取消但库存未恢复（出库记录还存在，或批次剩余没恢复）
    bills
      .filter((b) => b.status === 'cancelled')
      .forEach((bill) => {
        const billOuts = stockOuts.filter((o) => o.billId === bill.id);
        if (billOuts.length > 0) {
          result.push({
            id: `cancel-out-${bill.id}`,
            type: 'cancelled_not_restored',
            title: `账单 ${bill.billNo} 已取消但出库记录未清理`,
            description: `客户 ${bill.customerName}，${billOuts.length} 条出库记录共 ${billOuts.reduce((s, o) => s + o.quantity, 0)} 件未从库存恢复`,
            severity: 'high',
            action: {
              label: '查看账单',
              onClick: () => navigate(`/bills?billId=${bill.id}`),
            },
            metadata: { bill, billOuts },
          });
        }
      });

    // 3. 批次剩余和流水算不平
    batches.forEach((batch) => {
      const txs = allBatchTx.filter((t) => t.batchId === batch.id);
      const editQty = txs.filter((t) => t.type === 'edit').reduce((s, t) => s + t.quantityChange, 0);
      const txOutQty = txs.filter((t) => t.type === 'stock_out').reduce((s, t) => s + t.quantityChange, 0);
      const txRevokeQty = txs.filter((t) => t.type === 'revoke_out').reduce((s, t) => s + t.quantityChange, 0);
      const txCancelQty = txs.filter((t) => t.type === 'bill_cancel').reduce((s, t) => s + t.quantityChange, 0);

      const actualStockOuts = getStockOutsByBatch(batch.id);
      const totalOutFromRecords = actualStockOuts.reduce((s, o) => s + o.quantity, 0);
      const outQty = -Math.max(totalOutFromRecords, Math.abs(txOutQty));
      const revokeQty = txRevokeQty + txCancelQty;

      const createTx = txs.find((t) => t.type === 'create');
      const openingQty = createTx ? createTx.remainingAfter : batch.totalQuantity;
      const expectedRemaining = openingQty + editQty + outQty + revokeQty;
      const diff = expectedRemaining - batch.remainingQuantity;

      if (diff !== 0) {
        result.push({
          id: `batch-${batch.id}`,
          type: 'batch_mismatch',
          title: `批次 ${batch.batchNo} 数量不平`,
          description: `${batch.instrumentName}，预期剩余 ${expectedRemaining} 件，实际剩余 ${batch.remainingQuantity} 件，差异 ${diff > 0 ? '+' : ''}${diff} 件`,
          severity: Math.abs(diff) >= 3 ? 'high' : 'medium',
          action: {
            label: '查看批次',
            onClick: () => navigate(`/batches?batchId=${batch.id}`),
          },
          metadata: { batch, diff, expectedRemaining },
        });
      }
    });

    // 4. 未收款超15天
    const today = new Date();
    bills
      .filter((b) => b.status === 'unpaid')
      .forEach((bill) => {
        const created = new Date(bill.createdAt);
        const days = Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 15) {
          result.push({
            id: `unpaid-${bill.id}`,
            type: 'unpaid_overdue',
            title: `账单 ${bill.billNo} 逾期未收款`,
            description: `客户 ${bill.customerName}，账单金额 ¥${bill.finalAmount.toLocaleString()}，已逾期 ${days} 天`,
            severity: days >= 30 ? 'high' : 'medium',
            action: {
              label: '查看账单',
              onClick: () => navigate(`/bills?billId=${bill.id}`),
            },
            metadata: { bill, days },
          });
        }
      });

    return result.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }, [bills, batches, stockOuts, allBatchTx, navigate, getStockOutsByBatch]);

  const filteredAlerts = useMemo(
    () => (activeType === 'all' ? alerts : alerts.filter((a) => a.type === activeType)),
    [alerts, activeType]
  );

  const typeSummary = useMemo(() => {
    const s = { all: alerts.length, paid_not_full_out: 0, cancelled_not_restored: 0, batch_mismatch: 0, unpaid_overdue: 0 };
    alerts.forEach((a) => (s[a.type]++));
    return s;
  }, [alerts]);

  const typeConfig: Record<AlertType | 'all', { label: string; icon: any; color: string }> = {
    all: { label: '全部', icon: AlertTriangle, color: 'text-sandalwood-700' },
    paid_not_full_out: { label: '已收款未出库', icon: DollarSign, color: 'text-gold-700' },
    cancelled_not_restored: { label: '已取消未恢复', icon: XCircle, color: 'text-red-700' },
    batch_mismatch: { label: '批次数量不平', icon: Package, color: 'text-purple-700' },
    unpaid_overdue: { label: '逾期未收款', icon: Clock, color: 'text-orange-700' },
  };

  const severityColor = {
    high: 'border-l-red-500 bg-red-50',
    medium: 'border-l-gold-500 bg-gold-50',
    low: 'border-l-sandalwood-500 bg-sandalwood-50',
  };

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
            <h1 className="text-xl font-serif font-bold text-sandalwood-900">异常提醒</h1>
            <p className="text-sm text-sandalwood-500">集中展示履约和库存的异常情况</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {alerts.length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {alerts.length} 项异常
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['all', 'paid_not_full_out', 'cancelled_not_restored', 'batch_mismatch', 'unpaid_overdue'] as const).map((t) => {
          const cfg = typeConfig[t];
          const Icon = cfg.icon;
          const count = typeSummary[t];
          return (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              className={`card p-3 text-left transition-all ${
                activeType === t
                  ? 'ring-2 ring-sandalwood-800 bg-sandalwood-50'
                  : 'hover:bg-sandalwood-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${cfg.color}`} />
                <span className="text-sm font-medium text-sandalwood-700">{cfg.label}</span>
              </div>
              <p className="text-xl font-bold text-sandalwood-900">{count}</p>
            </button>
          );
        })}
      </div>

      <div className="card p-5">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <p className="text-lg font-medium text-sandalwood-700 mb-1">暂无异常</p>
            <p className="text-sm text-sandalwood-500">所有账单和库存数据都正常</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const cfg = typeConfig[alert.type];
              const Icon = cfg.icon;
              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-l-4 ${severityColor[alert.severity]} transition-all hover:shadow-sm`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            alert.severity === 'high'
                              ? 'bg-red-100 text-red-700'
                              : alert.severity === 'medium'
                              ? 'bg-gold-100 text-gold-700'
                              : 'bg-sandalwood-100 text-sandalwood-700'
                          }`}>
                            {alert.severity === 'high' ? '高优先级' : alert.severity === 'medium' ? '中优先级' : '低优先级'}
                          </span>
                          <span className="text-xs font-medium text-sandalwood-600 bg-white/60 px-2 py-0.5 rounded-full">
                            {cfg.label}
                          </span>
                        </div>
                        <p className="font-medium text-sandalwood-900 mb-1">{alert.title}</p>
                        <p className="text-sm text-sandalwood-600">{alert.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={alert.action.onClick}
                      className="btn btn-sandalwood text-sm gap-1 py-1.5 whitespace-nowrap flex-shrink-0"
                    >
                      {alert.action.label}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
