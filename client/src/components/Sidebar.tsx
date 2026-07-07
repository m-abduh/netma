'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { clearAuth } from '@/lib/auth';
import type { Employee } from '@/lib/types';

const menuItems: { path: string; label: string; icon: string }[] = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/chat', label: 'Chat', icon: '💬' },
  { path: '/notes', label: 'Notes', icon: '📋' },
  { path: '/jobs', label: 'Jobs', icon: '⏰' },
  { path: '/broadcast', label: 'Broadcast', icon: '📢' },
  { path: '/files', label: 'Files', icon: '📁' },
  { path: '/logs', label: 'Logs', icon: '📝' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: api.employees.list });
  const online = employees?.filter((e: Employee) => e.status === 'online').length || 0;

  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold">Netma</h1>
        <p className="text-sm text-slate-400 mt-1">
          {employees?.length || 0} karyawan ({online} online)
        </p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname === item.path
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-2 border-t border-slate-700">
        <button
          onClick={() => { clearAuth(); router.push('/'); }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-700 hover:text-red-400 transition-colors"
        >
          <span>🚪</span>
          Keluar
        </button>
      </div>
    </aside>
  );
}
