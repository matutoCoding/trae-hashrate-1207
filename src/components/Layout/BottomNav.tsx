import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calculator,
  FileText,
  Package,
  PackageOpen,
  Wrench,
} from 'lucide-react';

const navItems = [
  { path: '/', label: '首页', icon: LayoutDashboard },
  { path: '/billing-rules', label: '计费', icon: Calculator },
  { path: '/bills', label: '账单', icon: FileText },
  { path: '/batches', label: '批次', icon: Package },
  { path: '/stock-out', label: '出库', icon: PackageOpen },
  { path: '/maintenance', label: '保养', icon: Wrench },
];

export function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-sandalwood-200 z-50">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2 min-w-0 flex-1 transition-colors duration-200 ${
                isActive ? 'text-gold-600' : 'text-sandalwood-400'
              }`
            }
          >
            <item.icon className="w-5 h-5 mb-0.5" strokeWidth={1.5} />
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
