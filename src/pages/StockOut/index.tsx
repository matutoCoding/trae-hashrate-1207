import { useState } from 'react';
import {
  Plus,
  Search,
  PackageOpen,
  MapPin,
  User,
  Calendar,
  Wrench,
  X,
  TrendingUp,
  PieChart,
} from 'lucide-react';
import { useStockOutStore } from '@/store/useStockOutStore';
import { useBatchStore } from '@/store/useBatchStore';
import { getTodayString } from '@/utils/date';
import type { StockOut } from '@/types';

export default function StockOut() {
  const { stockOuts, addStockOut, getDestinationDistribution } =
    useStockOutStore();
  const { batches, getBatchById } = useBatchStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    batchId: '',
    quantity: 1,
    destination: '',
    receiver: '',
    needMaintenance: false,
    outDate: getTodayString(),
    remark: '',
  });

  const filteredStockOuts = stockOuts.filter((out) => {
    const batch = getBatchById(out.batchId);
    const matchesSearch =
      out.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      out.receiver.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (batch?.instrumentName || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const destinationDistribution = getDestinationDistribution();
  const totalOutQuantity = stockOuts.reduce((sum, o) => sum + o.quantity, 0);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addStockOut(formData);
    setIsCreateModalOpen(false);
    setFormData({
      batchId: '',
      quantity: 1,
      destination: '',
      receiver: '',
      needMaintenance: false,
      outDate: getTodayString(),
      remark: '',
    });
  };

  const selectedBatch = getBatchById(formData.batchId);
  const maxQuantity = selectedBatch?.remainingQuantity || 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-sandalwood-900 mb-1">
            拆分出库管理
          </h1>
          <p className="text-sandalwood-500 text-sm">
            管理批次拆分出库，追踪去向分布
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary gap-2"
        >
          <Plus className="w-4 h-4" />
          新建出库
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 bg-gradient-to-br from-sandalwood-50 to-sandalwood-100 border-none">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-sandalwood-200 rounded-lg flex items-center justify-center">
              <PackageOpen className="w-5 h-5 text-sandalwood-700" />
            </div>
            <div>
              <p className="text-sm text-sandalwood-600">累计出库</p>
              <p className="text-2xl font-bold text-sandalwood-900">
                {stockOuts.length} 笔
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5 bg-gradient-to-br from-gold-50 to-gold-100 border-none">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gold-200 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-gold-700" />
            </div>
            <div>
              <p className="text-sm text-gold-700">出库总量</p>
              <p className="text-2xl font-bold text-gold-800">
                {totalOutQuantity} 件
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5 bg-gradient-to-br from-teal-50 to-teal-100 border-none">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-teal-200 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <p className="text-sm text-teal-700">去向分布</p>
              <p className="text-2xl font-bold text-teal-800">
                {destinationDistribution.length} 个
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card p-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sandalwood-400" />
              <input
                type="text"
                className="input pl-10"
                placeholder="搜索去向、接收人、乐器名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredStockOuts.map((out) => {
              const batch = getBatchById(out.batchId);
              return (
                <div
                  key={out.id}
                  className="card p-5 hover:shadow-card-hover transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          out.needMaintenance
                            ? 'bg-gold-100 text-gold-700'
                            : 'bg-teal-100 text-teal-700'
                        }`}
                      >
                        <PackageOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sandalwood-900">
                          {batch?.instrumentName || '未知批次'}
                        </h3>
                        <p className="text-sm text-sandalwood-500">
                          {batch?.batchNo}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-sandalwood-500 text-xs">数量</p>
                        <p className="font-semibold text-sandalwood-900">
                          {out.quantity} 件
                        </p>
                      </div>
                      <div>
                        <p className="text-sandalwood-500 text-xs">去向</p>
                        <p className="font-medium text-sandalwood-700 truncate max-w-32">
                          {out.destination}
                        </p>
                      </div>
                      <div>
                        <p className="text-sandalwood-500 text-xs">接收人</p>
                        <p className="font-medium text-sandalwood-700">
                          {out.receiver}
                        </p>
                      </div>
                      <div>
                        <p className="text-sandalwood-500 text-xs">出库日期</p>
                        <p className="font-medium text-sandalwood-700">
                          {out.outDate}
                        </p>
                      </div>
                    </div>
                  </div>

                  {out.needMaintenance && (
                    <div className="mt-3 pt-3 border-t border-sandalwood-100 flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-gold-500" />
                      <span className="text-sm text-gold-600">
                        需要调律保养
                      </span>
                    </div>
                  )}

                  {out.remark && (
                    <p className="mt-2 text-sm text-sandalwood-500">
                      备注：{out.remark}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {filteredStockOuts.length === 0 && (
            <div className="card p-12 text-center">
              <PackageOpen className="w-16 h-16 text-sandalwood-300 mx-auto mb-4" />
              <p className="text-sandalwood-500">暂无出库记录</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="card p-5 sticky top-6">
            <h3 className="font-semibold text-sandalwood-900 mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-gold-500" />
              去向分布统计
            </h3>
            <div className="space-y-3">
              {destinationDistribution.map((item, index) => {
                const percent = (item.quantity / totalOutQuantity) * 100;
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
                      <span className="text-sm text-sandalwood-700 truncate max-w-32">
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
              })}
            </div>

            {destinationDistribution.length === 0 && (
              <p className="text-sm text-sandalwood-400 text-center py-8">
                暂无数据
              </p>
            )}
          </div>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-sandalwood-100 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold text-sandalwood-900">
                新建出库
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
                  {batches
                    .filter((b) => b.remainingQuantity > 0)
                    .map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.instrumentName} ({batch.batchNo}) - 剩余
                        {batch.remainingQuantity}件
                      </option>
                    ))}
                </select>
              </div>

              {selectedBatch && (
                <div className="bg-sandalwood-50 rounded-lg p-3">
                  <p className="text-sm text-sandalwood-600">
                    可出库数量：
                    <span className="font-semibold text-sandalwood-900">
                      {maxQuantity} 件
                    </span>
                  </p>
                </div>
              )}

              <div>
                <label className="label">出库数量</label>
                <input
                  type="number"
                  className="input"
                  min="1"
                  max={maxQuantity}
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: Math.min(
                        maxQuantity,
                        Math.max(1, Number(e.target.value))
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
                  value={formData.destination}
                  onChange={(e) =>
                    setFormData({ ...formData, destination: e.target.value })
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
                  value={formData.receiver}
                  onChange={(e) =>
                    setFormData({ ...formData, receiver: e.target.value })
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
                  value={formData.outDate}
                  onChange={(e) =>
                    setFormData({ ...formData, outDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-sandalwood-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-gold-600" />
                  <span className="text-sandalwood-700">需要调律保养</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      needMaintenance: !formData.needMaintenance,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.needMaintenance
                      ? 'bg-teal-500'
                      : 'bg-sandalwood-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.needMaintenance ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="label">备注</label>
                <textarea
                  className="input min-h-20"
                  value={formData.remark}
                  onChange={(e) =>
                    setFormData({ ...formData, remark: e.target.value })
                  }
                  placeholder="可选，填写其他说明信息"
                />
              </div>

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
                  disabled={!formData.batchId || formData.quantity > maxQuantity}
                >
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
