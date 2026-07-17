'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import DirBrowser from '@/components/DirBrowser';
import type { Employee } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: api.employees.list });
  const { data: dirInfo } = useQuery({ queryKey: ['project-dir'], queryFn: api.projectDir.info });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', rank: 'Junior', jobDesc: '', model: 'llama-3.3-70b-versatile', supervisorId: '', mode: 'plan' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [togglingMode, setTogglingMode] = useState<string | null>(null);
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
      toast.success('Direktori project diupdate');
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    } finally {
      setSavingDir(false);
    }
  };

  const addEmployee = async () => {
    if (!form.name || !form.jobDesc) return;
    await api.employees.create({ ...form, supervisorId: form.supervisorId || undefined, mode: form.mode });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    setForm({ name: '', rank: 'Junior', jobDesc: '', model: 'llama-3.3-70b-versatile', supervisorId: '', mode: 'plan' });
    setShowAdd(false);
    toast.success('Karyawan ditambahkan');
  };

  const updateEmployee = async (id: string) => {
    await api.employees.update(id, { ...form, supervisorId: form.supervisorId || null, mode: form.mode });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    setForm({ name: '', rank: 'Junior', jobDesc: '', model: 'llama-3.3-70b-versatile', supervisorId: '', mode: 'plan' });
    setEditingId(null);
    setShowAdd(false);
    toast.success('Karyawan diupdate');
  };

  const deleteEmployee = async (id: string) => {
    if (!confirm('Yakin hapus?')) return;
    await api.employees.delete(id);
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    toast.success('Karyawan dihapus');
  };

  const startEdit = (emp: Employee) => {
    setForm({ name: emp.name, rank: emp.rank, jobDesc: emp.jobDesc, model: emp.model, supervisorId: emp.supervisorId || '', mode: emp.mode || 'plan' });
    setEditingId(emp.id);
    setShowAdd(true);
  };

  const toggleMode = async (emp: Employee) => {
    setTogglingMode(emp.id);
    const newMode = emp.mode === 'build' ? 'plan' : 'build';
    try {
      await api.employees.update(emp.id, { mode: newMode });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(`${emp.name} → mode ${newMode}`);
    } catch (err: any) {
      toast.error('Gagal ganti mode: ' + err.message);
    } finally {
      setTogglingMode(null);
    }
  };

  const models = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'qwen/qwen3-32b',
    'qwen/qwen3.6-27b',
    'groq/compound',
    'groq/compound-mini',
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Manajemen Perusahaan</h2>
        <Dialog open={showAdd} onOpenChange={(o) => { if (!o) { setShowAdd(false); setEditingId(null); } setShowAdd(o); }}>
          <DialogTrigger
            render={
              <Button onClick={() => { setEditingId(null); setForm({ name: '', rank: 'Junior', jobDesc: '', model: 'llama-3.3-70b-versatile', supervisorId: '', mode: 'plan' }); }}>
                + Karyawan
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Karyawan' : 'Tambah Karyawan'}</DialogTitle>
              <DialogDescription>Atur data karyawan dan model AI yang digunakan</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nama</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama" />
              </div>
              <div className="space-y-1.5">
                <Label>Pekerjaan</Label>
                <Input value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} placeholder="cth: CEO, CTO" />
              </div>
              <div className="space-y-1.5">
                <Label>Job Description</Label>
                <Textarea value={form.jobDesc} onChange={(e) => setForm({ ...form, jobDesc: e.target.value })} placeholder="Job Description (akan jadi system prompt)" rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label>Model AI</Label>
                <Select value={form.model} onValueChange={(v) => setForm({ ...form, model: v ?? '' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Mode</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, mode: 'plan' })}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
                      form.mode === 'plan'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:text-foreground'
                    }`}
                  >
                    Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, mode: 'build' })}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
                      form.mode === 'build'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-background text-muted-foreground border-border hover:text-foreground'
                    }`}
                  >
                    Build
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Atasan</Label>
                <Select value={form.supervisorId} onValueChange={(v) => setForm({ ...form, supervisorId: v ?? '' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tidak Ada" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">Tidak Ada</SelectItem>
                    {employees?.filter((e: Employee) => e.id !== editingId).map((emp: Employee) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.rank})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setShowAdd(false); setEditingId(null); }}>Batal</Button>
              <Button onClick={editingId ? () => updateEmployee(editingId) : addEmployee}>
                {editingId ? 'Simpan' : 'Tambah'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Jabatan</TableHead>
              <TableHead>Atasan</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees?.map((emp: Employee) => (
              <TableRow key={emp.id}>
                <TableCell className="font-medium">{emp.name}</TableCell>
                <TableCell className="text-muted-foreground">{emp.rank}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{employees?.find((e: Employee) => e.id === emp.supervisorId)?.name || '-'}</TableCell>
                <TableCell>
                  <button
                    onClick={() => toggleMode(emp)}
                    disabled={togglingMode === emp.id}
                    className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                      emp.mode === 'build'
                        ? 'bg-emerald-600/20 text-emerald-600 border-emerald-600/30 hover:bg-emerald-600/30'
                        : 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30'
                    }`}
                  >
                    {togglingMode === emp.id ? '...' : emp.mode === 'build' ? 'Build' : 'Plan'}
                  </button>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{emp.model}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => startEdit(emp)}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteEmployee(emp.id)}>Hapus</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Card className="p-6 mt-6 max-w-lg">
        <h3 className="font-semibold mb-1">Direktori Project</h3>
        <p className="text-xs text-muted-foreground mb-3">Semua pekerjaan AI akan dilakukan di direktori ini.</p>
        <div className="text-xs text-muted-foreground mb-2 truncate bg-muted rounded px-3 py-2">{projectDir || '(belum diset)'}</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowBrowser(true)}>Browse</Button>
          <Button size="sm" onClick={saveProjectDir} disabled={savingDir || !projectDir.trim()}>
            {savingDir ? '...' : 'Simpan'}
          </Button>
        </div>
      </Card>
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