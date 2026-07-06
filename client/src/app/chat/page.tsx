'use client';

import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import { useStore } from '@/store';
import type { Employee } from '@/lib/types';

const ChatHeader = memo(function ChatHeader({
  name, rank, subordinates, hasChats, onClear,
}: {
  name: string; rank: string; subordinates: number; hasChats: boolean; onClear: () => void;
}) {
  return (
    <div className="p-4 border-b border-slate-700 flex items-center justify-between">
      <div>
        <h3 className="font-bold">{name}</h3>
        <p className="text-sm text-slate-400">{rank}</p>
        {subordinates > 0 && <p className="text-xs text-slate-500 mt-1">{subordinates} bawahan</p>}
      </div>
      {hasChats && (
        <button onClick={onClear} className="text-xs text-red-400 hover:text-red-300">Hapus</button>
      )}
    </div>
  );
});

const StreamBubble = memo(function StreamBubble({
  content, reasoning,
}: {
  content: string; reasoning: string;
}) {
  return (
    <div className="flex flex-col items-start">
      <div className="max-w-[80%] p-3 rounded-xl text-sm bg-slate-700 text-slate-200">
        {content ? (
          <div className="markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            <span className="inline-block w-2 h-4 bg-slate-400 animate-pulse ml-0.5 rounded-sm" />
          </div>
        ) : (
          <p className="text-slate-400 italic">Mengetik...</p>
        )}
        {reasoning && (
          <div className="mt-2 text-xs text-slate-400 border-t border-slate-600 pt-2">
            <div className="font-semibold mb-1">Reasoning</div>
            <pre className="whitespace-pre-wrap font-mono text-xs">{reasoning}</pre>
          </div>
        )}
      </div>
    </div>
  );
});

const ChatMessages = memo(function ChatMessages({
  chats, subordinates, onBroadcast, onAddKanban,
}: {
  chats: any[]; subordinates: Employee[]; onBroadcast: () => void; onAddKanban: (c: string) => void;
}) {
  const firstAssistantIdx = chats.findIndex((c: any) => c.role === 'assistant');
  return (
    <>
      {chats.map((chat: any, idx: number) => (
        <div key={chat.id} className={`flex flex-col ${chat.role === 'user' ? 'items-end' : 'items-start'}`}>
          <div className={`max-w-[80%] p-3 rounded-xl text-sm ${chat.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{chat.content}</ReactMarkdown>
            </div>
          </div>
          {chat.role === 'assistant' && idx === firstAssistantIdx && (
            <div className="flex gap-2 mt-2">
              {subordinates.length > 0 && (
                <button onClick={onBroadcast} className="px-3 py-1 text-xs bg-teal-600 hover:bg-teal-700 rounded-lg">
                  Sebarkan ke {subordinates.length} Bawahan
                </button>
              )}
              <button onClick={() => onAddKanban(chat.content)} className="px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 rounded-lg">
                ➕ Kanban
              </button>
            </div>
          )}
        </div>
      ))}
    </>
  );
});

const ChatInput = memo(function ChatInput({
  isStreaming, mode, onModeChange, onSend, onStop,
}: {
  isStreaming: boolean; mode: 'plan' | 'build'; onModeChange: (m: 'plan' | 'build') => void; onSend: (msg: string) => void; onStop: () => void;
}) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <div className="p-4 border-t border-slate-700">
      <div className="flex gap-2 items-center">
        <div className="flex bg-slate-800 rounded-lg p-0.5 text-xs shrink-0">
          <button
            onClick={() => onModeChange('plan')}
            className={`px-3 py-1.5 rounded-md transition-colors ${mode === 'plan' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Plan
          </button>
          <button
            onClick={() => onModeChange('build')}
            className={`px-3 py-1.5 rounded-md transition-colors ${mode === 'build' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Build
          </button>
        </div>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ketik prompt..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          disabled={isStreaming}
        />
        {isStreaming ? (
          <button onClick={onStop} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm shrink-0">Stop</button>
        ) : (
          <button onClick={handleSend} disabled={!text.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm shrink-0 disabled:opacity-50">Kirim</button>
        )}
      </div>
    </div>
  );
});

const EmployeeList = memo(function EmployeeList({
  employees, activeChat, onSelect,
}: {
  employees: Employee[]; activeChat: string | null; onSelect: (id: string) => void;
}) {
  return (
    <div className="w-56 border-l border-slate-700 flex flex-col overflow-auto shrink-0">
      <div className="p-3 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-slate-400">Karyawan</h3>
      </div>
      {employees.map((emp: Employee) => (
        <button
          key={emp.id}
          onClick={() => onSelect(emp.id)}
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
  );
});

export default function ChatPage() {
  const { activeChat, setActiveChat } = useStore();
  const [mode, setMode] = useState<'plan' | 'build'>('plan');
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingReasoning, setStreamingReasoning] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [optimisticMsgs, setOptimisticMsgs] = useState<any[]>([]);
  const streamAccumRef = useRef({ text: '', reasoning: '' });
  const streamAbortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: api.employees.list });
  const { data: chats, refetch: refetchChats } = useQuery({
    queryKey: ['chats', activeChat],
    queryFn: () => api.chat.history(activeChat!),
    enabled: !!activeChat,
  });
  const { data: columns } = useQuery({ queryKey: ['kanban-columns'], queryFn: api.kanban.columns.list });

  const activeEmployee = employees?.find((e: Employee) => e.id === activeChat);
  const subordinates = employees?.filter((e: Employee) => e.supervisorId === activeChat) || [];
  const employeeList = employees?.filter((e: Employee) => e.name !== 'Bos') || [];

  useEffect(() => {
    setOptimisticMsgs([]);
  }, [activeChat]);

  const displayChats = optimisticMsgs.length > 0
    ? [...optimisticMsgs, ...(chats?.filter((c: any) => !optimisticMsgs.some((o) => o.content === c.content && o.role === c.role)) || [])]
    : (chats || []);

  const sendMessage = useCallback(async (msg: string) => {
    if (!msg.trim() || !activeChat) return;
    setIsStreaming(true);
    setStreamingContent('');
    setStreamingReasoning('');
    streamAccumRef.current = { text: '', reasoning: '' };
    streamAbortRef.current = new AbortController();

    const optimisticUser = {
      id: `opt-user-${Date.now()}`,
      employeeId: activeChat,
      role: 'user',
      content: msg,
      createdAt: new Date().toISOString(),
    };
    setOptimisticMsgs((prev) => [optimisticUser, ...prev]);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/chat/${activeChat}/stream`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: msg, mode }),
          signal: streamAbortRef.current.signal,
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
              if (data.text) {
                streamAccumRef.current.text += data.text;
                setStreamingContent(streamAccumRef.current.text);
              }
              if (data.reasoning) {
                streamAccumRef.current.reasoning += data.reasoning;
                setStreamingReasoning(streamAccumRef.current.reasoning);
              }
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
      const { text } = streamAccumRef.current;
      if (text) {
        setOptimisticMsgs((prev) => [
          {
            id: `opt-assistant-${Date.now()}`,
            employeeId: activeChat,
            role: 'assistant',
            content: text,
            createdAt: new Date().toISOString(),
          },
          ...prev.filter((m) => m.id !== optimisticUser.id),
        ]);
      }
      streamAbortRef.current = null;
      refetchChats().then((data) => {
        if (data?.data && data.data.length > 0) {
          setOptimisticMsgs([]);
        }
      }).catch(() => {});
    }
  }, [activeChat, mode]);

  const handleStop = useCallback(() => {
    streamAbortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const handleClear = useCallback(async () => {
    if (!activeEmployee || !confirm('Hapus semua chat dengan ' + activeEmployee.name + '?')) return;
    await api.chat.clearHistory(activeEmployee.id);
    setOptimisticMsgs([]);
    refetchChats();
  }, [activeEmployee]);

  const handleBroadcast = useCallback(() => {
    if (!activeChat) return;
    api.chat.broadcastToSubordinates(activeChat, '', '').catch(() => {});
  }, [activeChat]);

  const handleAddKanban = useCallback((chatContent: string) => {
    const firstCol = columns?.[0];
    if (!firstCol) { alert('Buat kolom Kanban dulu'); return; }
    api.kanban.tasks.create({
      columnId: firstCol.id,
      title: chatContent.split('\n')[0].slice(0, 80) || 'Plan',
      description: chatContent,
      employeeId: activeChat,
      source: 'chat',
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['kanban-columns'] });
    }).catch((err) => alert('Gagal: ' + err.message));
  }, [columns, activeChat, queryClient]);

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        {!activeEmployee ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <p className="text-sm">Pilih karyawan dari daftar sebelah kanan</p>
          </div>
        ) : (
          <>
            <ChatHeader
              name={activeEmployee.name}
              rank={activeEmployee.rank}
              subordinates={subordinates.length}
              hasChats={!!(displayChats && displayChats.length > 0)}
              onClear={handleClear}
            />
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {isStreaming && <StreamBubble content={streamingContent} reasoning={streamingReasoning} />}
              {displayChats && displayChats.length > 0 && (
                <ChatMessages
                  chats={displayChats}
                  subordinates={subordinates}
                  onBroadcast={handleBroadcast}
                  onAddKanban={handleAddKanban}
                />
              )}
            </div>
            <ChatInput
              isStreaming={isStreaming}
              mode={mode}
              onModeChange={setMode}
              onSend={sendMessage}
              onStop={handleStop}
            />
          </>
        )}
      </div>
      <EmployeeList
        employees={employeeList}
        activeChat={activeChat}
        onSelect={setActiveChat}
      />
    </div>
  );
}
