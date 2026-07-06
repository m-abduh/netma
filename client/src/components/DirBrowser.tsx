'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function DirBrowser({
  current,
  onSelect,
  onClose,
}: {
  current: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}) {
  const [dir, setDir] = useState(current);
  const { data, isLoading } = useQuery({
    queryKey: ['browse', dir],
    queryFn: () => api.browse.list(dir),
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Pilih Direktori</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">&times;</button>
        </div>
        <div className="text-xs text-slate-400 mb-2 truncate bg-slate-900 rounded px-2 py-1">{dir}</div>
        <div className="flex-1 overflow-y-auto space-y-0.5 mb-4">
          {isLoading ? (
            <div className="text-slate-400 text-sm py-4 text-center">Loading...</div>
          ) : data?.parent && (
            <button
              onClick={() => setDir(data.parent)}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-700 text-sm text-yellow-400"
            >
              ..
            </button>
          )}
          {data?.items?.filter((i: any) => i.type === 'dir').map((item: any) => (
            <button
              key={item.name}
              onClick={() => setDir(`${dir}/${item.name}`)}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-700 text-sm flex items-center gap-2"
            >
              <span className="text-yellow-400">📁</span> {item.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">
            Batal
          </button>
          <button onClick={() => onSelect(dir)} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm">
            Pilih Folder Ini
          </button>
        </div>
      </div>
    </div>
  );
}
