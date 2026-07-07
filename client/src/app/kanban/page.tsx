'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import type { Note } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const columns = [
  { id: 'todo', label: 'To Do', color: 'border-t-slate-500' },
  { id: 'inprogress', label: 'In Progress', color: 'border-t-blue-500' },
  { id: 'done', label: 'Done', color: 'border-t-green-500' },
];

export default function KanbanPage() {
  const queryClient = useQueryClient();
  const { data: notes } = useQuery({ queryKey: ['notes'], queryFn: api.notes.list });
  const [expanded, setExpanded] = useState<string | null>(null);

  const deleteNote = async (id: string) => {
    if (!confirm('Hapus catatan ini?')) return;
    await api.notes.delete(id);
    queryClient.invalidateQueries({ queryKey: ['notes'] });
  };

  const grouped = {
    todo: notes?.filter((_: any, i: number) => i % 3 === 0) || [],
    inprogress: notes?.filter((_: any, i: number) => i % 3 === 1) || [],
    done: notes?.filter((_: any, i: number) => i % 3 === 2) || [],
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Kanban</h2>
        <span className="text-sm text-muted-foreground">{notes?.length || 0} catatan</span>
      </div>

      {notes?.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">Belum ada catatan. Simpan dari chat.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => (
          <div key={col.id}>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline">{col.label}</Badge>
              <span className="text-xs text-muted-foreground">{grouped[col.id as keyof typeof grouped].length}</span>
            </div>
            <div className="space-y-3">
              {grouped[col.id as keyof typeof grouped].map((note: Note) => (
                <Card key={note.id} className={cn('p-3 border-t-4', col.color)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {note.employee && (
                        <p className="text-xs font-semibold text-muted-foreground mb-1">{note.employee.name}</p>
                      )}
                      <div
                        className={cn('text-sm text-foreground cursor-pointer', expanded === note.id ? '' : 'line-clamp-3')}
                        onClick={() => setExpanded(expanded === note.id ? null : note.id)}
                      >
                        <div className="markdown-content text-xs">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteNote(note.id)} className="text-destructive hover:text-destructive shrink-0 h-6 w-6 p-0">✕</Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {new Date(note.createdAt).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}