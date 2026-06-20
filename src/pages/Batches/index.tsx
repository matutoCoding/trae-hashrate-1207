import { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  Package,
  AlertTriangle,
  Clock,
  X,
  Eye,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { useBatchStore } from '@/store/useBatchStore';
import { useStockOutStore } from '@/store/useStockOutStore';
import { useMaintenanceStore } from '@/store/useMaintenanceStore';
import { instrumentTypes } from '@/utils/mock';
import { getDaysUntilExpiry, formatDate } from '@/utils/date';
import type { Batch } from '@/types';

export default function Batches() {
  const { getBatchesWithStatus, addBatch, getBatchWithStatusById } = useBatchStore();
  const { getStockOutsByBatch, getDestinationDistributionByBatch, getTotalOutQuantityByBatch } = useStockOutStore();
  const { getMaintenancesByBatch } = useMaintenanceStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const batches = getBatchesWithStatus();

  const [formData, setFormData] = useState({
    batchNo: '',
    instrumentType: '钢琴',
    instrumentName: '',
    totalQuantity: 0,
    manufactureDate: '',
    expiryDate: '',
  });

  const filteredBatches = batches.filter((batch) => {
    const matchesSearch =
      batch.batchNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.instrumentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      typeFilter === 'all' || batch.instrumentType === typeFilter;
    const matchesStatus =
      statusFilter === 'all' || batch.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusBadge = (status: Batch['status']) => {
    const styles = {
      normal: 'badge-success',
      warning: 'badge-warning',
      expired: 'badge-danger',
    };
    const labels = {
      normal: '正常',
      warning: '临期',
      expired: '已过期',
    };
    return (
      <span className={`badge ${styles[status]}`}>{labels[status]}</span>
    );
  };

  const getUsagePercent = (batch: Batch) => {
    return ((batch.totalQuantity - batch.remainingQuantity) / batch.totalQuantity) * 100;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addBatch({
      ...formData,
      remainingQuantity: formData.totalQuantity,
    });
    setIsCreateModalOpen(false);
    setFormData({
      batchNo: '',
      instrumentType: '钢琴',
      instrumentName: '',
      totalQuantity: 0,
      manufactureDate: '',
      expiryDate: '',
    });
  };

  const viewBatchDetail = (batch: Batch) => {
    const batchWithStatus = getBatchWithStatusById(batch.id);
    if (batchWithStatus) {
      setSelectedBatch(batchWithStatus);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-sandalwood-900 mb-1">
            乐器批次管理
          </h1>
          <p className="text-sandalwood-500 text-sm">
            管理乐器批次，追踪库存和效期
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary gap-2"
        >
          <Plus className="w-4 h-4" />
          新增批次
        </button>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sandalwood-400" />
            <input
              type="text"
              className="input pl-10"
              placeholder="搜索批号、乐器名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sandalwood-400" />
              <select
                className="input pl-10 pr-8 appearance-none"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">全部类型</option>
                {instrumentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sandalwood-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                className="input pr-8 appearance-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">全部状态</option>
                <option value="normal">正常</option>
                <option value="warning">临期</option>
                <option value="expired">已过期</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sandalwood-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBatches.map((batch) => {
          const usagePercent = getUsagePercent(batch);
          const daysLeft = getDaysUntilExpiry(batch.expiryDate);
          return (
            <div
              key={batch.id}
              className="card p-5 hover:shadow-card-hover transition-all cursor-pointer"
              onClick={() => viewBatchDetail(batch)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      batch.status === 'normal'
                        ? 'bg-teal-100 text-teal-700'
                        : batch.status === 'warning'
                        ? 'bg-gold-100 text-gold-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sandalwood-900">
                      {batch.instrumentName}
                    </h3>
                    <p className="text-xs text-sandalwood-500">
                      {batch.batchNo}
                    </p>
                  </div>
                </div>
                {getStatusBadge(batch.status)}
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-sandalwood-500">已出库</span>
                  <span className="text-sandalwood-700 font-medium">
                    {batch.totalQuantity - batch.remainingQuantity}/
                    {batch.totalQuantity} 件
                  </span>
                </div>
                <div className="h-2 bg-sandalwood-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usagePercent > 80
                        ? 'bg-red-500'
                        : usagePercent > 50
                        ? 'bg-gold-500'
                        : 'bg-teal-500'
                    }`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-sandalwood-50 rounded-lg p-3">
                  <p className="text-xs text-sandalwood-500 mb-1">剩余数量</p>
                  <p className="text-lg font-bold text-sandalwood-900">
                    {batch.remainingQuantity}
                    <span className="text-sm font-normal text-sandalwood-400 ml-1">
                      件
                    </span>
                  </p>
                </div>
                <div className="bg-sandalwood-50 rounded-lg p-3">
                  <p className="text-xs text-sandalwood-500 mb-1">库存占比</p>
                  <p className="text-lg font-bold text-sandalwood-900">
                    {usagePercent.toFixed(0)}
                    <span className="text-sm font-normal text-sandalwood-400 ml-1">
                      %
                    </span>
                  </p>
                </div>
              </div>

              <div
                className={`flex items-center gap-2 p-3 rounded-lg ${
                  batch.status === 'expired'
                    ? 'bg-red-50 text-red-700'
                    : batch.status === 'warning'
                    ? 'bg-gold-50 text-gold-700'
                    : 'bg-teal-50 text-teal-700'
                }`}
              >
                {batch.status === 'expired' ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                <span className="text-sm">
                  {batch.status === 'expired'
                    ? `已过期 ${Math.abs(daysLeft)} 天`
                    : `有效期还剩 ${daysLeft} 天`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredBatches.length === 0 && (
        <div className="card p-12 text-center">
          <Package className="w-16 h-16 text-sandalwood-300 mx-auto mb-4" />
          <p className="text-sandalwood-500">暂无批次记录</p>
        </div>
      )}

      {selectedBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-sandalwood-100 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold text-sandalwood-900">
                批次详情
              </h2>
              <button
                onClick={() => setSelectedBatch(null)}
                className="text-sandalwood-400 hover:text-sandalwood-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                    selectedBatch.status === 'normal'
                      ? 'bg-teal-100 text-teal-700'
                      : selectedBatch.status === 'warning'
                      ? 'bg-gold-100 text-gold-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  <Package className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-sandalwood-900">
                    {selectedBatch.instrumentName}
                  </h3>
                  <p className="text-sandalwood-500">{selectedBatch.batchNo}</p>
                  <div className="mt-1">
                    {getStatusBadge(selectedBatch.status)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-sandalwood-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-sandalwood-500 mb-1">总数量</p>
                  <p className="text-2xl font-bold text-sandalwood-900">
                    {selectedBatch.totalQuantity}
                  </p>
                </div>
                <div className="bg-teal-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-teal-600 mb-1">剩余数量</p>
                  <p className="text-2xl font-bold text-teal-700">
                    {selectedBatch.remainingQuantity}
                  </p>
                </div>
                <div className="bg-gold-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gold-600 mb-1">已出库</p>
                  <p className="text-2xl font-bold text-gold-700">
                    {selectedBatch.totalQuantity -
                      selectedBatch.remainingQuantity}
                  </p>
                </div>
                <div className="bg-sandalwood-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-sandalwood-500 mb-1">出库率</p>
                  <p className="text-2xl font-bold text-sandalwood-900">
                    {getUsagePercent(selectedBatch).toFixed(0)}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="card p-4">
                  <p className="text-sm text-sandalwood-500 mb-1">生产日期</p>
                  <p className="font-medium text-sandalwood-900">
                    {selectedBatch.manufactureDate}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-sandalwood-500 mb-1">有效期至</p>
                  <p className="font-medium text-sandalwood-900">
                    {selectedBatch.expiryDate}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-sandalwood-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  去向分布
                </h4>
                <div className="space-y-2">
                  {getDestinationDistributionByBatch(selectedBatch.id).length > 0 ? (
                    getDestinationDistributionByBatch(selectedBatch.id).map((item, index) => {
                      const totalOut = getTotalOutQuantityByBatch(selectedBatch.id);
                      const percent = (item.quantity / totalOut) * 100;
                      const colors = [
                        'bg-teal-500',
                        'bg-gold-500',
                        'bg-sandalwood-500',
                        'bg-red-500',
                        'bg-blue-500',
                      ];
                      return (
                        <div key={index}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-sandalwood-700">
                              {item.destination}
                            </span>
                            <span className="text-sm font-medium text-sandalwood-900">
                              {item.quantity} 件
                            </span>
                          </div>
                          <div className="h-2 bg-sandalwood-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${colors[index % colors.length]}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-sandalwood-400 text-center py-4">
                      暂无去向数据
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-sandalwood-900 mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  出库记录
                  <span className="text-sm text-sandalwood-400 font-normal">
                    (共 {getStockOutsByBatch(selectedBatch.id).length} 条)
                  </span>
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {getStockOutsByBatch(selectedBatch.id).length > 0 ? (
                    getStockOutsByBatch(selectedBatch.id).map((out) => (
                      <div
                        key={out.id}
                        className="flex items-center justify-between p-3 bg-sandalwood-50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-sandalwood-900">
                            {out.destination}
                          </p>
                          <p className="text-xs text-sandalwood-500">
                            {out.outDate} · {out.receiver}
                            {out.billId && ' · 关联账单'}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-sandalwood-700">
                          -{out.quantity} 件
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-sandalwood-400 text-center py-4">
                      暂无出库记录
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sandalwood-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  保养记录
                  <span className="text-sm text-sandalwood-400 font-normal">
                    (共 {getMaintenancesByBatch(selectedBatch.id).length} 条)
                  </span>
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {getMaintenancesByBatch(selectedBatch.id).length > 0 ? (
                    getMaintenancesByBatch(selectedBatch.id).map((mt) => (
                      <div
                        key={mt.id}
                        className="flex items-center justify-between p-3 bg-sandalwood-50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-sandalwood-900">
                            {mt.type === 'tuning'
                              ? '调律'
                              : mt.type === 'repair'
                              ? '维修'
                              : '清洁'}
                          </p>
                          <p className="text-xs text-sandalwood-500">
                            {mt.scheduledDate} · {mt.operator}
                          </p>
                        </div>
                        <span
                          className={`badge ${
                            mt.status === 'completed'
                              ? 'badge-success'
                              : mt.status === 'pending'
                              ? 'badge-warning'
                              : 'badge-neutral'
                          }`}
                        >
                          {mt.status === 'completed'
                            ? '已完成'
                            : mt.status === 'pending'
                            ? '待处理'
                            : '已取消'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-sandalwood-400 text-center py-4">
                      暂无保养记录
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-sandalwood-100 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold text-sandalwood-900">
                新增批次
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
                <label className="label">批次编号</label>
                <input
                  type="text"
                  className="input"
                  value={formData.batchNo}
                  onChange={(e) =>
                    setFormData({ ...formData, batchNo: e.target.value })
                  }
                  placeholder="例如：YAMAHA-P-202406-001"
                  required
                />
              </div>

              <div>
                <label className="label">乐器类型</label>
                <select
                  className="input"
                  value={formData.instrumentType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      instrumentType: e.target.value,
                    })
                  }
                >
                  {instrumentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">乐器名称</label>
                <input
                  type="text"
                  className="input"
                  value={formData.instrumentName}
                  onChange={(e) =>
                    setFormData({ ...formData, instrumentName: e.target.value })
                  }
                  placeholder="例如：雅马哈立式钢琴"
                  required
                />
              </div>

              <div>
                <label className="label">总数量</label>
                <input
                  type="number"
                  className="input"
                  min="1"
                  value={formData.totalQuantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      totalQuantity: Number(e.target.value),
                    })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">生产日期</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.manufactureDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        manufactureDate: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="label">有效期至</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.expiryDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expiryDate: e.target.value,
                      })
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
                  创建批次
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
