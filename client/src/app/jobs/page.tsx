'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Employee } from '@/lib/types';

export default function JobsPage() {
  const queryClient = useQueryClient();
  const { data: jobs } = useQuery({ queryKey: ['jobs'], queryFn: api.jobs.list, refetchOnWindowFocus: false });
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: api.employees.list, refetchOnWindowFocus: false });
  const [showAdd, setShowAdd] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [notif, setNotif] = useState<string | null>(null);
  const [form, setForm] = useState({ employeeId: '', name: '', schedule: '0 8 * * *', prompt: '', mode: 'build' });

  useEffect(() => {
    if (!notif) return;
    const t = setTimeout(() => setNotif(null), 3000);
    return () => clearTimeout(t);
  }, [notif]);

  useEffect(() => {
    const running = jobs?.some(j => j.lastResult === 'running');
    if (!running) return;
    const interval = setInterval(() => queryClient.invalidateQueries({ queryKey: ['jobs'] }), 5000);
    return () => clearInterval(interval);
  }, [jobs, queryClient]);

  const addJob = async () => {
    if (!form.employeeId || !form.name || !form.prompt) return;
    await api.jobs.create(form);
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
    setForm({ employeeId: '', name: '', schedule: '0 8 * * *', prompt: '', mode: 'build' });
    setShowAdd(false);
  };

  const runJob = async (id: string) => {
    setErrors(prev => { const n = { ...prev }; delete n[id]; return n; });
    setSending(prev => ({ ...prev, [id]: true }));
    try {
      const res = await api.jobs.runNow(id);
      setNotif(res.message || 'Job terkirim ✅');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (e: any) {
      setErrors(prev => ({ ...prev, [id]: e.message || 'Gagal run job' }));
    } finally {
      setSending(prev => ({ ...prev, [id]: false }));
    }
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

      {notif && (
        <div className="mb-4 px-4 py-2 bg-green-700/80 text-green-100 rounded-lg text-sm text-center">
          {notif}
        </div>
      )}

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
          <select
            value={form.mode}
            onChange={(e) => setForm({ ...form, mode: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
          >
            <option value="plan">Plan (analisis aja)</option>
            <option value="build">Build (eksekusi langsung)</option>
          </select>
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
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    job.mode === 'build' ? 'bg-orange-600' : 'bg-blue-600'
                  }`}>
                    {job.mode === 'build' ? 'Build' : 'Plan'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => runJob(job.id)}
                    disabled={sending[job.id]}
                    className={`px-3 py-1 text-xs rounded-lg ${
                      sending[job.id]
                        ? 'bg-blue-800 text-blue-300 cursor-wait'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {sending[job.id] ? 'Mengirim...' : 'Run Now'}
                  </button>
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
                  Terakhir: {new Date(job.lastRun).toLocaleString('id-ID')} — {job.lastResult === 'success' ? '✅ Sukses' : job.lastResult === 'running' ? '⏳ Mengirim...' : '❌ Gagal'}
                </div>
              )}
              {errors[job.id] && (
                <div className="mt-2 text-xs text-red-400 bg-red-900/30 rounded px-2 py-1">
                  {errors[job.id]}
                </div>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}
