import { useState } from 'react';
import {
  Plus,
  Wrench,
  Music,
  Calendar as CalendarIcon,
  CheckCircle,
  Clock,
  XCircle,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useMaintenanceStore } from '@/store/useMaintenanceStore';
import { useBatchStore } from '@/store/useBatchStore';
import { getTodayString } from '@/utils/date';
import type { Maintenance } from '@/types';

export default function Maintenance() {
  const {
    maintenances,
    addMaintenance,
    completeMaintenance,
    cancelMaintenance,
    getPendingMaintenances,
    getMaintenancesByDate,
  } = useMaintenanceStore();
  const { batches } = useBatchStore();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    batchId: '',
    type: 'tuning' as Maintenance['type'],
    scheduledDate: getTodayString(),
    operator: '',
    remark: '',
  });

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMaintenance(formData);
    setIsCreateModalOpen(false);
    setFormData({
      batchId: '',
      type: 'tuning',
      scheduledDate: getTodayString(),
      operator: '',
      remark: '',
    });
  };

  const pendingMaintences = getPendingMaintenances();

  const getTypeLabel = (type: Maintenance['type']) => {
    const labels = {
      tuning: '调律',
      repair: '维修',
      cleaning: '清洁',
    };
    return labels[type];
  };

  const getTypeColor = (type: Maintenance['type']) => {
    const colors = {
      tuning: 'bg-teal-100 text-teal-700',
      repair: 'bg-gold-100 text-gold-700',
      cleaning: 'bg-sandalwood-100 text-sandalwood-700',
    };
    return colors[type];
  };

  const getStatusIcon = (status: Maintenance['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-teal-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-gold-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-sandalwood-400" />;
    }
  };

  const dayHasMaintenance = (dateStr: string) => {
    return getMaintenancesByDate(dateStr).length > 0;
  };

  const getDayMaintenances = (dateStr: string) => {
    return getMaintenancesByDate(dateStr);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(formatDate(date));
  };

  const selectedDayMaintenances = selectedDate
    ? getDayMaintenances(selectedDate)
    : [];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-sandalwood-900 mb-1">
            调律保养排期
          </h1>
          <p className="text-sandalwood-500 text-sm">
            管理乐器调律、维修和清洁保养排期
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary gap-2"
        >
          <Plus className="w-4 h-4" />
          新建排期
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 bg-gradient-to-br from-teal-50 to-teal-100 border-none">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-200 rounded-xl flex items-center justify-center">
              <Wrench className="w-6 h-6 text-teal-700" />
            </div>
            <div>
              <p className="text-sm text-teal-700">待处理任务</p>
              <p className="text-2xl font-bold text-teal-800">
                {pendingMaintences.length}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5 bg-gradient-to-br from-gold-50 to-gold-100 border-none">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gold-200 rounded-xl flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-gold-700" />
            </div>
            <div>
              <p className="text-sm text-gold-700">本月排期</p>
              <p className="text-2xl font-bold text-gold-800">
                {maintenances.filter((m) => {
                  const date = new Date(m.scheduledDate);
                  return (
                    date.getMonth() === currentMonth.getMonth() &&
                    date.getFullYear() === currentMonth.getFullYear()
                  );
                }).length}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5 bg-gradient-to-br from-sandalwood-50 to-sandalwood-100 border-none">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-sandalwood-200 rounded-xl flex items-center justify-center">
              <Music className="w-6 h-6 text-sandalwood-700" />
            </div>
            <div>
              <p className="text-sm text-sandalwood-600">涉及批次</p>
              <p className="text-2xl font-bold text-sandalwood-800">
                {new Set(maintenances.map((m) => m.batchId)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-sandalwood-900">
                {currentMonth.getFullYear()}年
                {currentMonth.getMonth() + 1}月
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  className="p-2 hover:bg-sandalwood-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-sandalwood-600" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-sandalwood-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-sandalwood-600" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-sandalwood-500 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((date, index) => {
                if (!date) {
                  return <div key={index} className="aspect-square" />;
                }
                const dateStr = formatDate(date);
                const hasMaintenance = dayHasMaintenance(dateStr);
                const today = isToday(date);
                const isSelected = selectedDate === dateStr;

                return (
                  <button
                    key={index}
                    onClick={() => handleDateClick(date)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all relative ${
                      isSelected
                        ? 'bg-gold-500 text-white shadow-lg'
                        : today
                        ? 'bg-sandalwood-100 text-sandalwood-900'
                        : 'hover:bg-sandalwood-50 text-sandalwood-700'
                    }`}
                  >
                    <span className="text-sm font-medium">{date.getDate()}</span>
                    {hasMaintenance && (
                      <div className="flex gap-0.5 mt-1">
                        {getDayMaintenances(dateStr)
                          .slice(0, 3)
                          .map((_, i) => (
                            <div
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? 'bg-white' : 'bg-teal-500'
                              }`}
                            />
                          ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDate && (
            <div className="card p-5 mt-6">
              <h3 className="font-semibold text-sandalwood-900 mb-4 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-gold-500" />
                {selectedDate} 的保养安排
              </h3>
              {selectedDayMaintenances.length > 0 ? (
                <div className="space-y-3">
                  {selectedDayMaintenances.map((mt) => {
                    const batch = batches.find((b) => b.id === mt.batchId);
                    return (
                      <div
                        key={mt.id}
                        className="flex items-center justify-between p-4 bg-sandalwood-50 rounded-xl"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTypeColor(
                              mt.type
                            )}`}
                          >
                            {getStatusIcon(mt.status)}
                          </div>
                          <div>
                            <p className="font-medium text-sandalwood-900">
                              {batch?.instrumentName || '未知批次'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`badge ${getTypeColor(mt.type)}`}
                              >
                                {getTypeLabel(mt.type)}
                              </span>
                              <span className="text-xs text-sandalwood-500">
                                {mt.operator}
                              </span>
                            </div>
                          </div>
                        </div>
                        {mt.status === 'pending' && (
                          <button
                            onClick={() => completeMaintenance(mt.id)}
                            className="btn btn-teal text-sm"
                          >
                            完成
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sandalwood-400 text-center py-8">
                  当天暂无保养安排
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="card p-5 sticky top-6">
            <h3 className="font-semibold text-sandalwood-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gold-500" />
              待处理任务
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendingMaintences.length > 0 ? (
                pendingMaintences.map((mt) => {
                  const batch = batches.find((b) => b.id === mt.batchId);
                  return (
                    <div
                      key={mt.id}
                      className="p-4 bg-sandalwood-50 rounded-xl border-l-4 border-l-gold-500"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`badge ${getTypeColor(mt.type)}`}>
                          {getTypeLabel(mt.type)}
                        </span>
                        <span className="text-xs text-sandalwood-500">
                          {mt.scheduledDate}
                        </span>
                      </div>
                      <p className="font-medium text-sandalwood-900 mb-1">
                        {batch?.instrumentName || '未知批次'}
                      </p>
                      <p className="text-sm text-sandalwood-500">
                        负责人：{mt.operator}
                      </p>
                      {mt.remark && (
                        <p className="text-xs text-sandalwood-400 mt-2">
                          {mt.remark}
                        </p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => completeMaintenance(mt.id)}
                          className="btn btn-teal text-xs flex-1 py-1.5"
                        >
                          完成
                        </button>
                        <button
                          onClick={() => cancelMaintenance(mt.id)}
                          className="btn btn-secondary text-xs flex-1 py-1.5"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sandalwood-400 text-center py-8 text-sm">
                  暂无待处理任务
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-sandalwood-100 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold text-sandalwood-900">
                新建保养排期
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
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.instrumentName} ({batch.batchNo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">保养类型</label>
                <select
                  className="input"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as Maintenance['type'],
                    })
                  }
                >
                  <option value="tuning">调律</option>
                  <option value="repair">维修</option>
                  <option value="cleaning">清洁保养</option>
                </select>
              </div>

              <div>
                <label className="label">计划日期</label>
                <input
                  type="date"
                  className="input"
                  value={formData.scheduledDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scheduledDate: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div>
                <label className="label">负责人</label>
                <input
                  type="text"
                  className="input"
                  value={formData.operator}
                  onChange={(e) =>
                    setFormData({ ...formData, operator: e.target.value })
                  }
                  placeholder="请输入负责人姓名"
                  required
                />
              </div>

              <div>
                <label className="label">备注</label>
                <textarea
                  className="input min-h-20"
                  value={formData.remark}
                  onChange={(e) =>
                    setFormData({ ...formData, remark: e.target.value })
                  }
                  placeholder="可选，填写保养说明"
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
                <button type="submit" className="btn btn-primary flex-1">
                  创建排期
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
