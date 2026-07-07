'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import type { Note } from '@/lib/types';

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
        <span className="text-sm text-slate-400">{notes?.length || 0} catatan</span>
      </div>

      <div className="space-y-3">
        {notes?.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-12">Belum ada catatan. Simpan dari chat.</p>
        )}
        {notes?.map((note: Note) => (
          <div key={note.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {note.employee && (
                  <h3 className="font-semibold mb-2 text-slate-100">{note.employee.name}</h3>
                )}
                <div
                  className={`text-sm text-slate-400 ${expanded === note.id ? '' : 'line-clamp-3'} cursor-pointer`}
                  onClick={() => setExpanded(expanded === note.id ? null : note.id)}
                >
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
              <button onClick={() => deleteNote(note.id)} className="text-xs text-red-400 hover:text-red-300 shrink-0">✕</button>
            </div>
            <p className="text-[10px] text-slate-600 mt-2">
              {new Date(note.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
