'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import type { Note } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function NotesPage() {
  const queryClient = useQueryClient();
  const { data: notes } = useQuery({ queryKey: ['notes'], queryFn: api.notes.list });
  const [expanded, setExpanded] = useState<string | null>(null);

  const deleteNote = async (id: string) => {
    if (!confirm('Hapus catatan ini?')) return;
    await api.notes.delete(id);
    queryClient.invalidateQueries({ queryKey: ['notes'] });
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Notes</h2>
        <span className="text-sm text-muted-foreground">{notes?.length || 0} catatan</span>
      </div>

      <div className="space-y-3">
        {notes?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">Belum ada catatan. Simpan dari chat.</p>
        )}
        {notes?.map((note: Note) => (
          <Card key={note.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {note.employee && (
                  <h3 className="font-semibold mb-2 text-foreground">{note.employee.name}</h3>
                )}
                <div
                  className={cn('text-sm text-muted-foreground cursor-pointer', expanded === note.id ? '' : 'line-clamp-3')}
                  onClick={() => setExpanded(expanded === note.id ? null : note.id)}
                >
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => deleteNote(note.id)} className="text-destructive hover:text-destructive shrink-0">✕</Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              {new Date(note.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}