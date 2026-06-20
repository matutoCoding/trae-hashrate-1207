import { useState } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Calculator } from 'lucide-react';
import { useBillingRuleStore } from '@/store/useBillingRuleStore';
import { formatCurrency } from '@/utils/pricing';
import { instrumentTypes } from '@/utils/mock';
import type { BillingRule } from '@/types';

export default function BillingRules() {
  const { rules, addRule, updateRule, deleteRule, toggleRule } =
    useBillingRuleStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BillingRule | null>(null);
  const [testDays, setTestDays] = useState(10);

  const [formData, setFormData] = useState({
    name: '',
    instrumentType: '钢琴',
    dailyRate: 0,
    startingPrice: 0,
    capPrice: 0,
    isActive: true,
  });

  const openModal = (rule?: BillingRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        name: rule.name,
        instrumentType: rule.instrumentType,
        dailyRate: rule.dailyRate,
        startingPrice: rule.startingPrice,
        capPrice: rule.capPrice,
        isActive: rule.isActive,
      });
    } else {
      setEditingRule(null);
      setFormData({
        name: '',
        instrumentType: '钢琴',
        dailyRate: 0,
        startingPrice: 0,
        capPrice: 0,
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRule) {
      updateRule(editingRule.id, formData);
    } else {
      addRule(formData);
    }
    setIsModalOpen(false);
  };

  const calculateTestPrice = () => {
    const base = formData.dailyRate * testDays;
    let final = base;
    let type = '标准计费';
    if (base < formData.startingPrice) {
      final = formData.startingPrice;
      type = '起步价';
    } else if (base > formData.capPrice && formData.capPrice > 0) {
      final = formData.capPrice;
      type = '封顶价';
    }
    return { base, final, type };
  };

  const testPrice = calculateTestPrice();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-sandalwood-900 mb-1">
            计费规则管理
          </h1>
          <p className="text-sandalwood-500 text-sm">
            配置乐器租赁计费规则，支持起步价和封顶价设置
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="btn btn-primary gap-2"
        >
          <Plus className="w-4 h-4" />
          新建规则
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rules.map((rule) => (
          <div key={rule.id} className="card p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-sandalwood-900 text-lg">
                  {rule.name}
                </h3>
                <span className="badge badge-neutral mt-1">
                  {rule.instrumentType}
                </span>
              </div>
              <button
                onClick={() => toggleRule(rule.id)}
                className="text-sandalwood-400 hover:text-sandalwood-600 transition-colors"
              >
                {rule.isActive ? (
                  <ToggleRight className="w-8 h-8 text-teal-500" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-sandalwood-300" />
                )}
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-sandalwood-500">日租金</span>
                <span className="font-medium text-sandalwood-900">
                  {formatCurrency(rule.dailyRate)}/天
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-sandalwood-500">起步价</span>
                <span className="font-medium text-gold-600">
                  {formatCurrency(rule.startingPrice)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-sandalwood-500">封顶价</span>
                <span className="font-medium text-teal-600">
                  {formatCurrency(rule.capPrice)}
                </span>
              </div>
            </div>

            <div className="bg-sandalwood-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-sandalwood-500 mb-2">计费说明</p>
              <p className="text-sm text-sandalwood-700">
                租期不足{Math.ceil(rule.startingPrice / rule.dailyRate)}天按起步价计算，
                超过{Math.floor(rule.capPrice / rule.dailyRate)}天按封顶价计算
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => openModal(rule)}
                className="btn btn-secondary flex-1 text-sm gap-1"
              >
                <Edit2 className="w-4 h-4" />
                编辑
              </button>
              <button
                onClick={() => deleteRule(rule.id)}
                className="btn btn-danger text-sm gap-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-sandalwood-100">
              <h2 className="text-xl font-serif font-bold text-sandalwood-900">
                {editingRule ? '编辑计费规则' : '新建计费规则'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">规则名称</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="例如：钢琴标准租"
                  required
                />
              </div>

              <div>
                <label className="label">乐器类型</label>
                <select
                  className="input"
                  value={formData.instrumentType}
                  onChange={(e) =>
                    setFormData({ ...formData, instrumentType: e.target.value })
                  }
                >
                  {instrumentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">日租金 (元)</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.dailyRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dailyRate: Number(e.target.value),
                      })
                    }
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="label">起步价 (元)</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.startingPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        startingPrice: Number(e.target.value),
                      })
                    }
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="label">封顶价 (元)</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.capPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capPrice: Number(e.target.value),
                      })
                    }
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="bg-gold-50 rounded-xl p-4 border border-gold-100">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="w-5 h-5 text-gold-600" />
                  <span className="font-medium text-gold-800">价格试算</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm text-gold-700">租期</span>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={testDays}
                    onChange={(e) => setTestDays(Number(e.target.value))}
                    className="flex-1 accent-gold-500"
                  />
                  <span className="text-sm font-medium text-gold-800 w-16 text-right">
                    {testDays} 天
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-white rounded-lg p-2 text-center">
                    <p className="text-gold-600 text-xs">基础租金</p>
                    <p className="font-semibold text-gold-800">
                      {formatCurrency(testPrice.base)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-2 text-center">
                    <p className="text-gold-600 text-xs">计费方式</p>
                    <p className="font-semibold text-gold-800">
                      {testPrice.type}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-2 text-center">
                    <p className="text-gold-600 text-xs">实付金额</p>
                    <p className="font-bold text-gold-700">
                      {formatCurrency(testPrice.final)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-sandalwood-50 rounded-lg">
                <span className="text-sandalwood-700">启用此规则</span>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, isActive: !formData.isActive })
                  }
                >
                  {formData.isActive ? (
                    <ToggleRight className="w-10 h-10 text-teal-500" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-sandalwood-300" />
                  )}
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary flex-1"
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
