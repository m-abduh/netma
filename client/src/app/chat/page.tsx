'use client';

import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import { useStore } from '@/store';
import type { Employee } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const ChatHeader = memo(function ChatHeader({
  name, rank, subordinates, hasChats, onClear, mobileTrigger,
}: {
  name: string; rank: string; subordinates: number; hasChats: boolean; onClear: () => void;
  mobileTrigger?: React.ReactNode;
}) {
  return (
    <div className="p-4 border-b border-border flex items-center justify-between">
      <div>
        <h3 className="font-bold">{name}</h3>
        <p className="text-sm text-muted-foreground">{rank}</p>
        {subordinates > 0 && <p className="text-xs text-muted-foreground mt-1">{subordinates} bawahan</p>}
      </div>
      <div className="flex items-center gap-2">
        <div className="md:hidden">{mobileTrigger}</div>
        {hasChats && (
          <Button variant="ghost" size="sm" onClick={onClear} className="text-destructive hover:text-destructive">Hapus</Button>
        )}
      </div>
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
      <Card className="max-w-[80%] p-3 text-sm">
        {content ? (
          <div className="markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            <span className="inline-block w-2 h-4 bg-muted-foreground animate-pulse ml-0.5 rounded-sm" />
          </div>
        ) : (
          <p className="text-muted-foreground italic">Mengetik...</p>
        )}
        {reasoning && (
          <div className="mt-2 text-xs text-muted-foreground border-t border-border pt-2">
            <div className="font-semibold mb-1">Reasoning</div>
            <pre className="whitespace-pre-wrap font-mono text-xs">{reasoning}</pre>
          </div>
        )}
      </Card>
    </div>
  );
});

const ChatMessages = memo(function ChatMessages({
  chats, subordinates, onBroadcast, onSaveNote,
}: {
  chats: any[]; subordinates: Employee[]; onBroadcast: (prompt: string, response: string) => void; onSaveNote: (c: string) => void;
}) {
  const firstAssistantIdx = chats.findIndex((c: any) => c.role === 'assistant');
  const response = firstAssistantIdx >= 0 ? chats[firstAssistantIdx].content : '';
  const prompt = firstAssistantIdx >= 0 && firstAssistantIdx + 1 < chats.length ? chats[firstAssistantIdx + 1].content : '';
  return (
    <>
      {chats.map((chat: any, idx: number) => (
        <div key={chat.id} className={cn('flex flex-col', chat.role === 'user' ? 'items-end' : 'items-start')}>
          <Card className={cn('max-w-[80%] p-3 text-sm', chat.role === 'user' ? 'bg-primary text-primary-foreground border-primary' : '')}>
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{chat.content}</ReactMarkdown>
            </div>
          </Card>
          {chat.role === 'assistant' && idx === firstAssistantIdx && (
            <div className="flex gap-2 mt-2">
              {subordinates.length > 0 && (
                <Button variant="default" size="sm" onClick={() => onBroadcast(prompt, response)} className="bg-teal-600 hover:bg-teal-700 text-white">
                  Sebarkan ke {subordinates.length} Bawahan
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => onSaveNote(chat.content)}>
                Simpan
              </Button>
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  return (
    <div className="p-4 border-t border-border">
      <div className="flex gap-2 items-end">
        <div className="flex bg-muted rounded-lg p-0.5 text-xs shrink-0 mb-1">
          <button
            onClick={() => onModeChange('plan')}
            className={cn('px-3 py-1.5 rounded-md transition-colors', mode === 'plan' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            Plan
          </button>
          <button
            onClick={() => onModeChange('build')}
            className={cn('px-3 py-1.5 rounded-md transition-colors', mode === 'build' ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground')}
          >
            Build
          </button>
        </div>
        <Textarea
          ref={textareaRef as any}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ketik prompt... (Enter kirim, Shift+Enter baris baru)"
          disabled={isStreaming}
          className="flex-1 min-h-[40px] max-h-[160px] resize-none py-2.5"
          rows={1}
        />
        {isStreaming ? (
          <Button variant="destructive" size="default" onClick={onStop} className="shrink-0 mb-1">Stop</Button>
        ) : (
          <Button variant="default" size="default" onClick={handleSend} disabled={!text.trim()} className="shrink-0 mb-1">Kirim</Button>
        )}
      </div>
    </div>
  );
});

const MobileEmployeeSheet = memo(function MobileEmployeeSheet({
  employees, activeChat, onSelect,
}: {
  employees: Employee[]; activeChat: string | null; onSelect: (id: string) => void;
}) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <span>👥</span>
            Karyawan
          </Button>
        }
      />
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>Karyawan</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1 mt-4">
          {employees.map((emp: Employee) => (
            <SheetClose key={emp.id} asChild>
              <button
                onClick={() => onSelect(emp.id)}
                className={cn('flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-left hover:bg-accent transition-colors',
                  activeChat === emp.id ? 'bg-accent' : '')}
              >
                <span>{emp.status === 'online' ? '🟢' : '🔴'}</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate">{emp.name}</div>
                  <div className="text-xs truncate text-muted-foreground">{emp.rank}</div>
                </div>
              </button>
            </SheetClose>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
});

const EmployeeList = memo(function EmployeeList({
  employees, activeChat, onSelect,
}: {
  employees: Employee[]; activeChat: string | null; onSelect: (id: string) => void;
}) {
  return (
    <div className="hidden md:flex w-56 border-l border-border flex-col overflow-auto shrink-0">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-semibold text-muted-foreground">Karyawan</h3>
      </div>
      <ScrollArea className="flex-1">
        {employees.map((emp: Employee) => (
          <button
            key={emp.id}
            onClick={() => onSelect(emp.id)}
            className={cn('flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors',
              activeChat === emp.id ? 'bg-accent' : '',
              emp.status === 'online' ? '' : 'text-muted-foreground')}
          >
            <span>{emp.status === 'online' ? '🟢' : '🔴'}</span>
            <div className="flex-1 min-w-0">
              <div className="truncate">{emp.name}</div>
              <div className="text-xs truncate text-muted-foreground">{emp.rank}</div>
            </div>
          </button>
        ))}
      </ScrollArea>
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

  const handleBroadcast = useCallback((prompt: string, response: string) => {
    if (!activeChat) return;
    if (!prompt) { alert('Tidak ada prompt untuk disebarkan'); return; }
    api.chat.broadcastToSubordinates(activeChat, prompt, response).then((res: any) => {
      alert(`Broadcast terkirim ke ${res.count} bawahan: ${res.names.join(', ')}`);
    }).catch((err) => alert('Gagal broadcast: ' + err.message));
  }, [activeChat]);

  const handleSaveNote = useCallback((chatContent: string) => {
    const title = chatContent.split('\n')[0].slice(0, 80) || 'Catatan';
    api.notes.create({ title, content: chatContent, employeeId: activeChat })
      .then(() => { alert('Catatan tersimpan'); })
      .catch((err) => alert('Gagal simpan: ' + err.message));
  }, [activeChat]);

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {!activeEmployee ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
            <div className="md:hidden">
              <MobileEmployeeSheet
                employees={employeeList}
                activeChat={activeChat}
                onSelect={setActiveChat}
              />
            </div>
            <p className="text-sm">Pilih karyawan dari daftar</p>
          </div>
        ) : (
          <>
            <ChatHeader
              name={activeEmployee.name}
              rank={activeEmployee.rank}
              subordinates={subordinates.length}
              hasChats={!!(displayChats && displayChats.length > 0)}
              onClear={handleClear}
              mobileTrigger={
                <MobileEmployeeSheet
                  employees={employeeList}
                  activeChat={activeChat}
                  onSelect={setActiveChat}
                />
              }
            />
            <ScrollArea className="flex-1 min-h-0 p-4">
              <div className="space-y-4">
                {isStreaming && <StreamBubble content={streamingContent} reasoning={streamingReasoning} />}
                {displayChats && displayChats.length > 0 && (
                  <ChatMessages
                    chats={displayChats}
                    subordinates={subordinates}
                    onBroadcast={handleBroadcast}
                    onSaveNote={handleSaveNote}
                  />
                )}
              </div>
            </ScrollArea>
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