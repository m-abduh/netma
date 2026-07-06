'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function LogsPage() {
  const [filters, setFilters] = useState({ actor: '', action: '', date: '' });
  const { data, isLoading } = useQuery({
    queryKey: ['logs', filters],
    queryFn: () => api.logs.list(filters),
  });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Audit Log</h2>

      <div className="flex gap-4 mb-6">
        <input
          value={filters.date}
          onChange={(e) => setFilters({ ...filters, date: e.target.value })}
          type="date"
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={filters.actor}
          onChange={(e) => setFilters({ ...filters, actor: e.target.value })}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Semua Aktor</option>
          <option value="Bos">Bos</option>
          <option value="System">System</option>
        </select>
        <select
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Semua Aksi</option>
          <option value="Job trigger">Job trigger</option>
          <option value="Job error">Job error</option>
          <option value="Chat">Chat</option>
          <option value="Turn ON/OFF">Turn ON/OFF</option>
          <option value="CRUD">CRUD</option>
          <option value="Edit job">Edit job</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-slate-400">Loading...</div>
      ) : (
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left p-3 text-slate-400 font-medium">Waktu</th>
                <th className="text-left p-3 text-slate-400 font-medium">Aktor</th>
                <th className="text-left p-3 text-slate-400 font-medium">Aksi</th>
                <th className="text-left p-3 text-slate-400 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {data?.logs?.map((log: any) => (
                <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/50">
                  <td className="p-3 text-slate-400 text-xs">
                    {new Date(log.createdAt).toLocaleString('id-ID')}
                  </td>
                  <td className="p-3">{log.actor}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-slate-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300">{log.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
