'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Employee } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function JobsPage() {
  const queryClient = useQueryClient();
  const { data: jobs } = useQuery({ queryKey: ['jobs'], queryFn: api.jobs.list, refetchOnWindowFocus: false });
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: api.employees.list, refetchOnWindowFocus: false });
  const [showAdd, setShowAdd] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ employeeId: '', name: '', schedule: '0 8 * * *', prompt: '', mode: 'build' });

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
    toast.success('Job berhasil dibuat');
  };

  const runJob = async (id: string) => {
    setErrors(prev => { const n = { ...prev }; delete n[id]; return n; });
    setSending(prev => ({ ...prev, [id]: true }));
    try {
      const res = await api.jobs.runNow(id);
      toast.success(res.message || 'Job terkirim');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (e: any) {
      setErrors(prev => ({ ...prev, [id]: e.message || 'Gagal run job' }));
      toast.error(e.message || 'Gagal run job');
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
    toast.success('Job dihapus');
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Daily Jobs</h2>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger
            render={<Button>+ Job</Button>}
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Buat Job Baru</DialogTitle>
              <DialogDescription>Atur jadwal cron untuk mengirim prompt ke karyawan</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Karyawan</Label>
                <Select
                  value={form.employeeId ?? ''}
                  onValueChange={(v) => setForm({ ...form, employeeId: v ?? '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Karyawan" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((emp: Employee) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nama Job</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nama Job"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Jadwal (Cron)</Label>
                <Input
                  value={form.schedule}
                  onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                  placeholder="0 8 * * *"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mode</Label>
                <Select
                  value={form.mode}
                  onValueChange={(v) => setForm({ ...form, mode: v ?? '' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plan">Plan (analisis aja)</SelectItem>
                    <SelectItem value="build">Build (eksekusi langsung)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prompt</Label>
                <Textarea
                  value={form.prompt}
                  onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                  placeholder="Prompt untuk AI..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Batal</Button>
              <Button onClick={addJob}>Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left font-medium text-muted-foreground px-4 py-3">Status</th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3">Nama</th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Karyawan</th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Jadwal</th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Mode</th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden xl:table-cell">Terakhir</th>
              <th className="text-right font-medium text-muted-foreground px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {jobs?.map((job: any) => (
              <tr key={job.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <Badge variant={job.status === 'active' ? 'default' : 'secondary'} className="text-[11px]">
                    {job.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{job.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{job.prompt}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{job.employee?.name || '-'}</td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden lg:table-cell">{job.schedule}</td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <Badge variant="outline" className={cn('text-[11px]', job.mode === 'build' ? 'text-orange-400 border-orange-400/30' : 'text-blue-400 border-blue-400/30')}>
                    {job.mode === 'build' ? 'Build' : 'Plan'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden xl:table-cell">
                  {job.lastRun ? (
                    <span className={cn(
                      job.lastResult === 'success' ? 'text-green-400' : job.lastResult === 'running' ? 'text-yellow-400' : 'text-red-400'
                    )}>
                      {new Date(job.lastRun).toLocaleString('id-ID')}
                    </span>
                  ) : '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => runJob(job.id)}
                      disabled={sending[job.id] || job.status !== 'active'}
                      className="h-8 px-2 text-xs"
                    >
                      {sending[job.id] ? '...' : 'Run'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleJob(job)}
                      className="h-8 px-2 text-xs"
                    >
                      {job.status === 'active' ? 'Stop' : 'Start'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteJob(job.id)}
                      className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                    >
                      Hapus
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {(!jobs || jobs.length === 0) && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                  Belum ada job. Buat job baru untuk mulai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}