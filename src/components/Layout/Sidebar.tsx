import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calculator,
  FileText,
  Package,
  PackageOpen,
  Wrench,
  Music,
  CalendarDays,
  Bell,
} from 'lucide-react';

const navItems = [
  { path: '/', label: '首页总览', icon: LayoutDashboard },
  { path: '/billing-rules', label: '计费规则', icon: Calculator },
  { path: '/bills', label: '账单管理', icon: FileText },
  { path: '/batches', label: '乐器批次', icon: Package },
  { path: '/stock-out', label: '拆分出库', icon: PackageOpen },
  { path: '/maintenance', label: '保养排期', icon: Wrench },
  { path: '/month-end', label: '月结对账', icon: CalendarDays },
  { path: '/alerts', label: '异常提醒', icon: Bell },
];

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-64 bg-sandalwood-900 text-white h-screen sticky top-0">
      <div className="p-6 border-b border-sandalwood-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gold-500 rounded-lg flex items-center justify-center">
            <Music className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-serif text-lg font-semibold">乐器租赁系统</h1>
            <p className="text-xs text-sandalwood-400">Instrument Rental</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/30'
                  : 'text-sandalwood-200 hover:bg-sandalwood-800 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-sandalwood-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-9 h-9 rounded-full bg-sandalwood-700 flex items-center justify-center">
            <span className="text-sm font-medium">管</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">管理员</p>
            <p className="text-xs text-sandalwood-400">运营管理员</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
