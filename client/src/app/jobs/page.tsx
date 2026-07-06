'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Employee } from '@/lib/types';

export default function JobsPage() {
  const queryClient = useQueryClient();
  const { data: jobs } = useQuery({ queryKey: ['jobs'], queryFn: api.jobs.list });
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: api.employees.list });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ employeeId: '', name: '', schedule: '0 8 * * *', prompt: '' });

  const addJob = async () => {
    if (!form.employeeId || !form.name || !form.prompt) return;
    await api.jobs.create(form);
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
    setForm({ employeeId: '', name: '', schedule: '0 8 * * *', prompt: '' });
    setShowAdd(false);
  };

  const runJob = async (id: string) => {
    await api.jobs.runNow(id);
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
  };

  const toggleJob = async (job: any) => {
    await api.jobs.update(job.id, { ...job, status: job.status === 'active' ? 'inactive' : 'active' });
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
  };

  const deleteJob = async (id: string) => {
    await api.jobs.delete(id);
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Daily Jobs</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
        >
          + Job
        </button>
      </div>

      {showAdd && (
        <div className="bg-slate-800 rounded-xl p-4 mb-6 space-y-3">
          <select
            value={form.employeeId}
            onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Pilih Karyawan</option>
            {employees?.map((emp: Employee) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nama Job"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={form.schedule}
            onChange={(e) => setForm({ ...form, schedule: e.target.value })}
            placeholder="Cron expression: 0 8 * * *"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            value={form.prompt}
            onChange={(e) => setForm({ ...form, prompt: e.target.value })}
            placeholder="Prompt untuk AI..."
            rows={3}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm resize-none"
          />
          <div className="flex gap-2">
            <button onClick={addJob} className="px-4 py-2 bg-green-600 rounded-lg text-sm">Simpan</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-slate-700 rounded-lg text-sm">Batal</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {jobs?.map((job: any) => (
          <div key={job.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">{job.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  job.status === 'active' ? 'bg-green-600' : 'bg-slate-600'
                }`}>
                  {job.status === 'active' ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => runJob(job.id)} className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded-lg">Run Now</button>
                <button onClick={() => toggleJob(job)} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg">
                  {job.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button onClick={() => deleteJob(job.id)} className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 rounded-lg">Hapus</button>
              </div>
            </div>
            <div className="text-sm text-slate-400">
              <span>{job.employee?.name} — {job.schedule}</span>
            </div>
            <p className="text-sm text-slate-300 mt-1">{job.prompt}</p>
            {job.lastRun && (
              <div className="mt-2 text-xs text-slate-500">
                Terakhir: {new Date(job.lastRun).toLocaleString('id-ID')} — {job.lastResult === 'success' ? '✅' : '❌'} {job.lastResult}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
