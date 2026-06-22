import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell() {
  return (
    <div className="flex min-h-screen overflow-hidden bg-slate-50 text-slate-950">
      <Sidebar />
      <div className="min-w-0 flex-1 overflow-x-hidden">
        <TopBar />
        <main className="min-w-0 overflow-x-hidden px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
