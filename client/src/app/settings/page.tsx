'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import DirBrowser from '@/components/DirBrowser';
import type { Employee } from '@/lib/types';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: api.employees.list });
  const { data: dirInfo } = useQuery({ queryKey: ['project-dir'], queryFn: api.projectDir.info });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', rank: 'Junior', jobDesc: '', model: 'opencode/big-pickle', supervisorId: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [projectDir, setProjectDir] = useState('');
  const [savingDir, setSavingDir] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);

  useEffect(() => {
    if (dirInfo?.path) setProjectDir(dirInfo.path);
  }, [dirInfo]);

  const saveProjectDir = async () => {
    if (!projectDir.trim()) return;
    setSavingDir(true);
    try {
      await api.projectDir.update(projectDir);
      queryClient.invalidateQueries({ queryKey: ['project-dir'] });
      alert('Direktori project diupdate');
    } catch (err: any) {
      alert('Gagal: ' + err.message);
    } finally {
      setSavingDir(false);
    }
  };

  const addEmployee = async () => {
    if (!form.name || !form.jobDesc) return;
    await api.employees.create({ ...form, supervisorId: form.supervisorId || undefined });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    setForm({ name: '', rank: 'Junior', jobDesc: '', model: 'opencode/big-pickle', supervisorId: '' });
    setShowAdd(false);
  };

  const updateEmployee = async (id: string) => {
    await api.employees.update(id, { ...form, supervisorId: form.supervisorId || null });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    setForm({ name: '', rank: 'Junior', jobDesc: '', model: 'opencode/big-pickle', supervisorId: '' });
    setEditingId(null);
  };

  const deleteEmployee = async (id: string) => {
    if (!confirm('Yakin hapus?')) return;
    await api.employees.delete(id);
    queryClient.invalidateQueries({ queryKey: ['employees'] });
  };

  const startEdit = (emp: Employee) => {
    setForm({ name: emp.name, rank: emp.rank, jobDesc: emp.jobDesc, model: emp.model, supervisorId: emp.supervisorId || '' });
    setEditingId(emp.id);
    setShowAdd(false);
  };

  const models = [
    'opencode/big-pickle',
    'opencode/deepseek-v4-flash-free',
    'opencode/nemotron-3-ultra-free',
    'opencode/north-mini-code-free',
    'opencode/mimo-v2.5-free',
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Manajemen Karyawan</h2>
        <button
          onClick={() => { setShowAdd(true); setEditingId(null); setForm({ name: '', rank: 'Junior', jobDesc: '', model: 'opencode/big-pickle', supervisorId: '' }); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
        >
          + Karyawan
        </button>
      </div>

      {(showAdd || editingId) && (
        <div className="bg-slate-800 rounded-xl p-6 mb-6 space-y-4 max-w-lg">
          <h3 className="font-semibold">{editingId ? 'Edit Karyawan' : 'Tambah Karyawan'}</h3>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nama"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={form.rank}
            onChange={(e) => setForm({ ...form, rank: e.target.value })}
            placeholder="Pekerjaan (cth: CEO, CTO, Frontend Developer)"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            value={form.jobDesc}
            onChange={(e) => setForm({ ...form, jobDesc: e.target.value })}
            placeholder="Job Description (akan jadi system prompt)"
            rows={3}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm resize-none"
          />
          <select
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
          >
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Atasan</label>
            <select
              value={form.supervisorId}
              onChange={(e) => setForm({ ...form, supervisorId: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Tidak Ada</option>
              {employees?.filter((e: Employee) => e.id !== editingId).map((emp: Employee) => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.rank})</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={editingId ? () => updateEmployee(editingId) : addEmployee}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm"
            >
              {editingId ? 'Simpan' : 'Tambah'}
            </button>
            <button onClick={() => { setShowAdd(false); setEditingId(null); }} className="px-4 py-2 bg-slate-700 rounded-lg text-sm">Batal</button>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left p-3 text-slate-400 font-medium">Nama</th>
              <th className="text-left p-3 text-slate-400 font-medium">Jabatan</th>
              <th className="text-left p-3 text-slate-400 font-medium">Atasan</th>
              <th className="text-left p-3 text-slate-400 font-medium">Model</th>
              <th className="text-left p-3 text-slate-400 font-medium">Port</th>
              <th className="text-left p-3 text-slate-400 font-medium">Status</th>
              <th className="text-left p-3 text-slate-400 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {employees?.map((emp: Employee) => (
              <tr key={emp.id} className="border-b border-slate-700/50 hover:bg-slate-700/50">
                <td className="p-3 font-medium">{emp.name}</td>
                <td className="p-3 text-slate-400">{emp.rank}</td>
                <td className="p-3 text-xs text-slate-400">{employees?.find((e: Employee) => e.id === emp.supervisorId)?.name || '-'}</td>
                <td className="p-3 text-xs text-slate-400">{emp.model}</td>
                <td className="p-3 text-slate-400">{emp.port}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    emp.status === 'online' ? 'bg-green-600' : 'bg-red-600'
                  }`}>
                    {emp.status}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(emp)} className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded">Edit</button>
                    <button onClick={() => deleteEmployee(emp.id)} className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded">Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 mt-6 max-w-lg">
        <h3 className="font-semibold mb-4">Direktori Project</h3>
        <p className="text-xs text-slate-400 mb-3">Semua pekerjaan AI akan dilakukan di direktori ini.</p>
        <div className="text-xs text-slate-400 mb-2 truncate bg-slate-900 rounded px-3 py-2">{projectDir || '(belum diset)'}</div>
        <div className="flex gap-2">
          <button onClick={() => setShowBrowser(true)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">Browse</button>
          <button
            onClick={saveProjectDir}
            disabled={savingDir || !projectDir.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm disabled:opacity-50"
          >
            {savingDir ? '...' : 'Simpan'}
          </button>
        </div>
      </div>
      {showBrowser && (
        <DirBrowser
          current={projectDir}
          onSelect={(p) => { setProjectDir(p); setShowBrowser(false); }}
          onClose={() => setShowBrowser(false)}
        />
      )}
    </div>
  );
}
