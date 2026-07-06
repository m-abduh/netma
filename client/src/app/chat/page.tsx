'use client';

import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import { useStore } from '@/store';
import type { Employee } from '@/lib/types';

export default function ChatPage() {
  const { activeChat, setActiveChat } = useStore();
  const [prompt, setPrompt] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingReasoning, setStreamingReasoning] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const streamAbortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: api.employees.list });
  const { data: chats, refetch: refetchChats } = useQuery({
    queryKey: ['chats', activeChat],
    queryFn: () => api.chat.history(activeChat!),
    enabled: !!activeChat,
    refetchInterval: isStreaming ? false : 3000,
  });
  const { data: columns } = useQuery({ queryKey: ['kanban-columns'], queryFn: api.kanban.columns.list });

  const activeEmployee = employees?.find((e: Employee) => e.id === activeChat);
  const subordinates = employees?.filter((e: Employee) => e.supervisorId === activeChat) || [];
  const firstAssistantMsg = chats?.find((c: any) => c.role === 'assistant');
  const lastUserMsg = chats?.find((c: any) => c.role === 'user');

  const sendMessage = async () => {
    if (!prompt.trim() || !activeChat) return;
    const msg = prompt;
    setPrompt('');
    setIsStreaming(true);
    setStreamingContent('');
    setStreamingReasoning('');

    const abortController = new AbortController();
    streamAbortRef.current = abortController;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/chat/${activeChat}/stream`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: msg }),
          signal: abortController.signal,
        }
      );
      if (!response.ok) {
        const err = await response.text().catch(() => '');
        throw new Error(err || 'Stream request failed');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'delta') {
              if (data.text) setStreamingContent((prev) => prev + data.text);
              if (data.reasoning) setStreamingReasoning((prev) => prev + data.reasoning);
            } else if (data.type === 'error') {
              alert(data.message);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') alert(err.message);
    } finally {
      setIsStreaming(false);
      streamAbortRef.current = null;
      refetchChats();
    }
  };

  const broadcastToSubordinates = async () => {
    if (!activeChat || !lastUserMsg || !firstAssistantMsg) return;
    setBroadcasting(true);
    try {
      const result = await api.chat.broadcastToSubordinates(activeChat, lastUserMsg.content, firstAssistantMsg.content);
      refetchChats();
      setTimeout(refetchChats, 3000);
      setTimeout(refetchChats, 8000);
      alert(`Pesan tersebar ke ${result.names.length} bawahan:\n${result.names.join(', ')}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBroadcasting(false);
    }
  };

  const addToKanban = async (chatContent: string, empId?: string) => {
    const firstCol = columns?.[0];
    if (!firstCol) {
      alert('Buat kolom Kanban dulu di halaman Kanban');
      return;
    }
    try {
      const title = chatContent.split('\n')[0].slice(0, 80);
      await api.kanban.tasks.create({
        columnId: firstCol.id,
        title: title || 'Plan',
        description: chatContent,
        employeeId: empId || activeChat,
        source: 'chat',
      });
      queryClient.invalidateQueries({ queryKey: ['kanban-columns'] });
      alert('Task berhasil ditambahkan ke Kanban');
    } catch (err: any) {
      alert('Gagal: ' + err.message);
    }
  };

  const employeeList = employees?.filter((e: Employee) => e.name !== 'Bos') || [];

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        {!activeEmployee ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <p className="text-sm">Pilih karyawan dari daftar sebelah kanan</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold">{activeEmployee.name}</h3>
                <p className="text-sm text-slate-400">{activeEmployee.rank}</p>
                {subordinates.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">{subordinates.length} bawahan</p>
                )}
              </div>
              {chats && chats.length > 0 && (
                <button
                  onClick={async () => {
                    if (!confirm('Hapus semua chat dengan ' + activeEmployee.name + '?')) return;
                    await api.chat.clearHistory(activeEmployee.id);
                    refetchChats();
                  }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Hapus
                </button>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {isStreaming && (
                <div className="flex flex-col items-start">
                  <div className="max-w-[80%] p-3 rounded-xl text-sm bg-slate-700 text-slate-200">
                    {streamingContent ? (
                      <div className="markdown-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamingContent}
                        </ReactMarkdown>
                        <span className="inline-block w-2 h-4 bg-slate-400 animate-pulse ml-0.5 rounded-sm" />
                      </div>
                    ) : (
                      <p className="text-slate-400 italic">Mengetik...</p>
                    )}
                    {streamingReasoning && (
                      <div className="mt-2 text-xs text-slate-400 border-t border-slate-600 pt-2">
                        <div className="font-semibold mb-1">Reasoning</div>
                        <pre className="whitespace-pre-wrap font-mono text-xs">{streamingReasoning}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {chats?.map((chat: any, idx: number) => (
                <div
                  key={chat.id}
                  className={`flex flex-col ${chat.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-xl text-sm ${
                      chat.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    <div className="markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {chat.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  {chat.role === 'assistant' && chats.findIndex((c: any) => c.role === 'assistant') === idx && (
                    <div className="flex gap-2 mt-2">
                      {subordinates.length > 0 && (
                        <button
                          onClick={broadcastToSubordinates}
                          disabled={broadcasting}
                          className="px-3 py-1 text-xs bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50"
                        >
                          {broadcasting ? 'Menyebarkan...' : `Sebarkan ke ${subordinates.length} Bawahan`}
                        </button>
                      )}
                      <button
                        onClick={() => addToKanban(chat.content)}
                        className="px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 rounded-lg"
                      >
                        ➕ Kanban
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-700">
              <div className="flex gap-2">
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Ketik prompt..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                  disabled={isStreaming}
                />
                {isStreaming ? (
                  <button
                    onClick={() => { streamAbortRef.current?.abort(); setIsStreaming(false); }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={sendMessage}
                    disabled={!prompt.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm disabled:opacity-50"
                  >
                    Kirim
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      <div className="w-56 border-l border-slate-700 flex flex-col overflow-auto shrink-0">
        <div className="p-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-400">Karyawan</h3>
        </div>
        {employeeList.map((emp: Employee) => (
          <button
            key={emp.id}
            onClick={() => setActiveChat(emp.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-700 transition-colors ${
              activeChat === emp.id ? 'bg-slate-700' : ''
            } ${emp.status === 'online' ? 'text-white' : 'text-slate-500'}`}
          >
            <span>{emp.status === 'online' ? '🟢' : '🔴'}</span>
            <div className="flex-1 min-w-0">
              <div className="truncate">{emp.name}</div>
              <div className="text-xs truncate text-slate-500">{emp.rank}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
