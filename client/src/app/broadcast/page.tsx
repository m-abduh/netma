'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

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
      toast.success('Broadcast terkirim');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-2xl font-bold mb-2">Broadcast</h2>
      <p className="text-sm text-muted-foreground mb-6">Kirim 1 prompt ke semua karyawan yang ON sekaligus</p>

      <Card className="p-4 space-y-4">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Tulis prompt untuk semua karyawan..."
          rows={4}
        />
        <Button
          onClick={send}
          disabled={sending || !prompt.trim()}
        >
          {sending ? 'Mengirim...' : 'Broadcast ke Semua'}
        </Button>
      </Card>

      {results && (
        <div className="mt-8 space-y-4">
          <h3 className="font-semibold">Hasil</h3>
          {results.map((r, i) => (
            <Card key={i} className={`p-4 ${!r.success ? 'border-destructive/50' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${r.success ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="font-semibold">{r.name}</span>
              </div>
              {r.success ? (
                <p className="text-sm text-foreground">{r.output}</p>
              ) : (
                <p className="text-sm text-destructive">{r.error}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}