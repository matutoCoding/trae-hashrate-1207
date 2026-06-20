import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export function Layout() {
  return (
    <div className="min-h-screen bg-warmGray-50 flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 pb-20 lg:pb-0">
          <div className="page-transition">
            <Outlet />
          </div>
        </div>
        <BottomNav />
      </main>
    </div>
  );
}
