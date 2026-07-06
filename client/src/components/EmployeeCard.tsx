'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const toggleMutation = useMutation({
    mutationFn: () =>
      employee.status === 'online'
        ? api.employees.turnOff(employee.id)
        : api.employees.turnOn(employee.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

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
        <div className={`w-3 h-3 rounded-full ${employee.status === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
      </div>
      <p className="text-sm text-slate-400 mt-3 line-clamp-2">{employee.jobDesc}</p>
      {lastChat && (
        <p className="text-xs text-slate-500 mt-2 truncate">
          <span className="text-blue-400">Chat terakhir:</span> {lastChat.content}
        </p>
      )}
      <div className="flex items-center justify-end mt-4">
        <div className="flex gap-2">
          <button
            onClick={() => onChat(employee.id)}
            className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Chat
          </button>
          <button
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
            className={`px-3 py-1 text-xs rounded-lg transition-colors disabled:opacity-50 ${
              employee.status === 'online'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {employee.status === 'online' ? 'OFF' : 'ON'}
          </button>
        </div>
      </div>
    </div>
  );
}
