'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useStore } from '@/store';
import EmployeeCard from '@/components/EmployeeCard';
import type { Employee } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const { setActiveChat } = useStore();
  const { data: employees, isLoading } = useQuery({ queryKey: ['employees'], queryFn: api.employees.list });
  const { data: recentChats } = useQuery({
    queryKey: ['recent-chats'],
    queryFn: api.chat.recent,
    refetchInterval: 5000,
  });

  const handleChat = (id: string) => {
    setActiveChat(id);
    router.push('/chat');
  };

  if (isLoading) return <div className="p-8 text-slate-400">Loading...</div>;

  const online = employees?.filter((e: Employee) => e.status === 'online').length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex gap-4 text-sm">
          <div className="bg-slate-800 px-4 py-2 rounded-lg">
            <span className="text-slate-400">Total: </span>
            <span className="font-bold">{employees?.length || 0}</span>
          </div>
          <div className="bg-slate-800 px-4 py-2 rounded-lg">
            <span className="text-slate-400">Online: </span>
            <span className="font-bold text-green-400">{online}</span>
          </div>
          <div className="bg-slate-800 px-4 py-2 rounded-lg">
            <span className="text-slate-400">Offline: </span>
            <span className="font-bold text-red-400">{(employees?.length || 0) - online}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees?.map((emp: Employee) => (
          <EmployeeCard
            key={emp.id}
            employee={emp}
            onChat={handleChat}
            lastChat={recentChats?.[emp.id]}
          />
        ))}
      </div>
    </div>
  );
}
