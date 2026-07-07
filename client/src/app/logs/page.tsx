'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function LogsPage() {
  const [filters, setFilters] = useState({ actor: '', action: '', date: '' });
  const { data, isLoading } = useQuery({
    queryKey: ['logs', filters],
    queryFn: () => api.logs.list(filters),
  });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Audit Log</h2>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="w-44">
          <Input
            value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            type="date"
          />
        </div>
        <Select
          value={filters.actor}
          onValueChange={(v) => setFilters({ ...filters, actor: v ?? '' })}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Semua Aktor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">Semua Aktor</SelectItem>
            <SelectItem value="Bos">Bos</SelectItem>
            <SelectItem value="System">System</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.action}
          onValueChange={(v) => setFilters({ ...filters, action: v ?? '' })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Semua Aksi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">Semua Aksi</SelectItem>
            <SelectItem value="Job trigger">Job trigger</SelectItem>
            <SelectItem value="Job error">Job error</SelectItem>
            <SelectItem value="Chat">Chat</SelectItem>
            <SelectItem value="Turn ON/OFF">Turn ON/OFF</SelectItem>
            <SelectItem value="CRUD">CRUD</SelectItem>
            <SelectItem value="Edit job">Edit job</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Aktor</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.logs?.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell>{log.actor}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{log.detail}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}