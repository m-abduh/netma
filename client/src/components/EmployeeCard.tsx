'use client';

import { api } from '@/lib/api';
import type { Employee } from '@/lib/types';

const rankColors: Record<string, string> = {
  Boss: 'bg-purple-600',
  Manager: 'bg-blue-600',
  Lead: 'bg-teal-600',
  Senior: 'bg-green-600',
  Junior: 'bg-yellow-600',
};

export default function EmployeeCard({
  employee,
  onChat,
  lastChat,
}: {
  employee: Employee;
  onChat: (id: string) => void;
  lastChat?: any;
}) {
  const rankColor = rankColors[employee.rank.split(' ')[0]] || 'bg-slate-600';

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${rankColor} rounded-full flex items-center justify-center text-sm font-bold`}>
            {employee.name[0]}
          </div>
          <div>
            <h3 className="font-semibold">{employee.name}</h3>
            <p className="text-sm text-slate-400">{employee.rank}</p>
          </div>
        </div>
      </div>
      <p className="text-sm text-slate-400 mt-3 line-clamp-2">{employee.jobDesc}</p>
      {lastChat && (
        <p className="text-xs text-slate-500 mt-2 truncate">
          <span className="text-blue-400">Chat terakhir:</span> {lastChat.content}
        </p>
      )}
      <div className="flex items-center justify-end mt-4">
        <button
          onClick={() => onChat(employee.id)}
          className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
        >
          Chat
        </button>
      </div>
    </div>
  );
}
