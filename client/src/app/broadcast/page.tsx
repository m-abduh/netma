'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function BroadcastPage() {
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const queryClient = useQueryClient();

  const send = async () => {
    if (!prompt.trim()) return;
    setSending(true);
    setResults(null);
    try {
      const res = await api.broadcast.send(prompt);
      setResults(res.results);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Broadcast</h2>
      <p className="text-sm text-slate-400 mb-4">Kirim 1 prompt ke semua karyawan yang ON sekaligus</p>

      <div className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Tulis prompt untuk semua karyawan..."
          rows={4}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500 resize-none"
        />
        <button
          onClick={send}
          disabled={sending || !prompt.trim()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm disabled:opacity-50"
        >
          {sending ? 'Mengirim...' : 'Broadcast ke Semua'}
        </button>
      </div>

      {results && (
        <div className="mt-8 space-y-4">
          <h3 className="font-semibold">Hasil</h3>
          {results.map((r, i) => (
            <div key={i} className={`rounded-xl p-4 ${r.success ? 'bg-slate-800' : 'bg-red-900/30'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${r.success ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="font-semibold">{r.name}</span>
              </div>
              {r.success ? (
                <p className="text-sm text-slate-300">{r.output}</p>
              ) : (
                <p className="text-sm text-red-400">{r.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
