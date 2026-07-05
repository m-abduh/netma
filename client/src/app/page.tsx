'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import { useStore } from '@/store';
import type { Employee } from '@/lib/types';

type PageView = 'dashboard' | 'chat' | 'organogram' | 'kanban' | 'files' | 'logs' | 'broadcast' | 'jobs' | 'settings';

export default function Home() {
  const [page, setPage] = useState<PageView>('dashboard');
  const { activeChat, setActiveChat } = useStore();

  return (
    <div className="flex h-screen">
      <Sidebar page={page} setPage={setPage} />
      <main className="flex-1 overflow-auto">
        {page === 'dashboard' && <DashboardPage onChat={(id) => { setActiveChat(id); setPage('chat'); }} />}
        {page === 'chat' && <ChatPage />}
        {page === 'organogram' && <OrganogramPage onChat={(id) => { setActiveChat(id); setPage('chat'); }} />}
        {page === 'kanban' && <KanbanPage />}
        {page === 'files' && <FilesPage />}
        {page === 'logs' && <LogsPage />}
        {page === 'broadcast' && <BroadcastPage />}
        {page === 'jobs' && <JobsPage />}
        {page === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}

function Sidebar({ page, setPage }: { page: PageView; setPage: (p: PageView) => void }) {
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: api.employees.list });
  const online = employees?.filter((e: Employee) => e.status === 'online').length || 0;

  const menuItems: { key: PageView; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'chat', label: 'Chat', icon: '💬' },
    { key: 'organogram', label: 'Organisasi', icon: '🌳' },
    { key: 'kanban', label: 'Kanban', icon: '📋' },
    { key: 'jobs', label: 'Jobs', icon: '⏰' },
    { key: 'broadcast', label: 'Broadcast', icon: '📢' },
    { key: 'files', label: 'Files', icon: '📁' },
    { key: 'logs', label: 'Logs', icon: '📝' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold">Netma</h1>
        <p className="text-sm text-slate-400 mt-1">
          {employees?.length || 0} karyawan ({online} online)
        </p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setPage(item.key)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              page === item.key
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function DashboardPage({ onChat }: { onChat: (id: string) => void }) {
  const { data: employees, isLoading } = useQuery({ queryKey: ['employees'], queryFn: api.employees.list });
  const { data: recentChats } = useQuery({
    queryKey: ['recent-chats'],
    queryFn: api.chat.recent,
    refetchInterval: 5000,
  });
  const queryClient = useQueryClient();

  if (isLoading) return <div className="p-8 text-slate-400">Loading...</div>;

  const online = employees?.filter((e: Employee) => e.status === 'online').length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex gap-4 text-sm">
          <div className="bg-slate-800 px-4 py-2 rounded-lg">
            <span className="text-slate-400">Total: </span>
            <span className="font-bold">{employees?.length || 0}</span>
          </div>
          <div className="bg-slate-800 px-4 py-2 rounded-lg">
            <span className="text-slate-400">Online: </span>
            <span className="font-bold text-green-400">{online}</span>
          </div>
          <div className="bg-slate-800 px-4 py-2 rounded-lg">
            <span className="text-slate-400">Offline: </span>
            <span className="font-bold text-red-400">{(employees?.length || 0) - online}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees?.map((emp: Employee) => (
          <EmployeeCard
            key={emp.id}
            employee={emp}
            onChat={onChat}
            lastChat={recentChats?.[emp.id]}
          />
        ))}
      </div>
    </div>
  );
}

function EmployeeCard({ employee, onChat, lastChat }: { employee: Employee; onChat: (id: string) => void; lastChat?: any }) {
  const queryClient = useQueryClient();
  const toggleMutation = useMutation({
    mutationFn: () =>
      employee.status === 'online'
        ? api.employees.turnOff(employee.id)
        : api.employees.turnOn(employee.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const rankColors: Record<string, string> = {
    Boss: 'bg-purple-600',
    Manager: 'bg-blue-600',
    Lead: 'bg-teal-600',
    Senior: 'bg-green-600',
    Junior: 'bg-yellow-600',
  };
  const rankColor = rankColors[employee.rank.split(' ')[0]] || 'bg-slate-600';

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${rankColor} rounded-full flex items-center justify-center text-sm font-bold`}>
            {employee.name[0]}
          </div>
          <div>
            <h3 className="font-semibold">{employee.name}</h3>
            <p className="text-sm text-slate-400">{employee.rank}</p>
          </div>
        </div>
        <div className={`w-3 h-3 rounded-full ${employee.status === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
      </div>
      <p className="text-sm text-slate-400 mt-3 line-clamp-2">{employee.jobDesc}</p>
      {lastChat && (
        <p className="text-xs text-slate-500 mt-2 truncate">
          <span className="text-blue-400">Chat terakhir:</span> {lastChat.content}
        </p>
      )}
      <div className="flex items-center justify-end mt-4">
        <div className="flex gap-2">
          <button
            onClick={() => onChat(employee.id)}
            className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Chat
          </button>
          <button
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
            className={`px-3 py-1 text-xs rounded-lg transition-colors disabled:opacity-50 ${
              employee.status === 'online'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {employee.status === 'online' ? 'OFF' : 'ON'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatPage() {
  const { activeChat, setActiveChat } = useStore();
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: api.employees.list });
  const { data: chats, refetch: refetchChats } = useQuery({
    queryKey: ['chats', activeChat],
    queryFn: () => api.chat.history(activeChat!),
    enabled: !!activeChat,
    refetchInterval: 3000,
  });
  const { data: columns } = useQuery({ queryKey: ['kanban-columns'], queryFn: api.kanban.columns.list });

  const activeEmployee = employees?.find((e: Employee) => e.id === activeChat);
  const subordinates = employees?.filter((e: Employee) => e.supervisorId === activeChat) || [];
  const lastUserMsg = chats?.filter((c: any) => c.role === 'user').slice(-1)[0];
  const lastAssistantMsg = chats?.filter((c: any) => c.role === 'assistant').slice(-1)[0];

  const sendMessage = async () => {
    if (!prompt.trim() || !activeChat) return;
    setSending(true);
    try {
      await api.chat.send(activeChat, prompt);
      setPrompt('');
      refetchChats();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const broadcastToSubordinates = async () => {
    if (!activeChat || !lastUserMsg || !lastAssistantMsg) return;
    setBroadcasting(true);
    try {
      await api.chat.broadcastToSubordinates(activeChat, lastUserMsg.content, lastAssistantMsg.content);
      refetchChats();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBroadcasting(false);
    }
  };

  const addToKanban = async (chatContent: string, empId?: string) => {
    const firstCol = columns?.[0];
    if (!firstCol) return;
    const title = chatContent.split('\n')[0].slice(0, 80);
    await api.kanban.tasks.create({
      columnId: firstCol.id,
      title: title || 'Plan',
      description: chatContent,
      employeeId: empId || activeChat,
      source: 'chat',
    });
    queryClient.invalidateQueries({ queryKey: ['kanban-columns'] });
  };

  const employeeList = employees?.filter((e: Employee) => e.id !== activeChat) || [];

  return (
    <div className="flex h-full">
      {!activeEmployee ? (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-slate-400">Pilih Karyawan</h2>
            <p className="text-sm">Pilih karyawan dari sidebar untuk mulai chat</p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {employees?.filter((e: Employee) => e.name !== 'Bos').map((emp: Employee) => (
                <button
                  key={emp.id}
                  onClick={() => setActiveChat(emp.id)}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    emp.status === 'online'
                      ? 'bg-slate-700 hover:bg-slate-600'
                      : 'bg-slate-800 text-slate-600'
                  }`}
                >
                  {emp.name} {emp.status === 'online' ? '🟢' : '🔴'}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <div>
              <h3 className="font-bold">{activeEmployee.name}</h3>
              <p className="text-sm text-slate-400">{activeEmployee.rank}</p>
              {subordinates.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">{subordinates.length} bawahan</p>
              )}
            </div>
            <button
              onClick={() => setActiveChat(null)}
              className="text-sm text-slate-400 hover:text-white"
            >
              Tutup
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-4">
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
                    {chat.role === 'user' ? (
                      chat.content
                    ) : (
                      <div className="markdown-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {chat.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {chat.role === 'assistant' && subordinates.length > 0 && idx === chats.length - 1 && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={broadcastToSubordinates}
                        disabled={broadcasting}
                        className="px-3 py-1 text-xs bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50"
                      >
                        {broadcasting ? 'Menyebarkan...' : `Sebarkan ke ${subordinates.length} Bawahan`}
                      </button>
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
            {sending && (
              <div className="flex justify-start">
                <div className="bg-slate-700 p-3 rounded-xl text-sm text-slate-400 italic">
                  Mengetik...
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-slate-700">
            <div className="flex gap-2">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ketik prompt..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                disabled={sending}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !prompt.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm disabled:opacity-50"
              >
                {sending ? '...' : 'Kirim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeEmployee && (
        <div className="w-64 border-l border-slate-700 p-4 overflow-auto">
          <h4 className="text-sm font-semibold text-slate-400 mb-3">Karyawan Lain</h4>
          <div className="space-y-2">
            {employeeList.map((emp: Employee) => (
              <button
                key={emp.id}
                onClick={() => setActiveChat(emp.id)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-700 text-sm flex items-center gap-2"
              >
                <div className={`w-2 h-2 rounded-full ${emp.status === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
                {emp.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const rankColors: Record<string, string> = {
  Boss: '#9333ea',
  Manager: '#2563eb',
  Lead: '#0d9488',
  Senior: '#16a34a',
  Junior: '#ca8a04',
};

function getRankColor(rank: string) {
  const key = rank.split(' ')[0];
  return rankColors[key] || '#64748b';
}

function EmployeeNode({ data }: { data: any }) {
  return (
    <div
      className="px-4 py-3 rounded-xl border-2 text-center shadow-lg cursor-pointer hover:brightness-110 transition-all"
      style={{ borderColor: data.color, backgroundColor: '#1e293b', minWidth: 150 }}
    >
      <Handle type="target" position={Position.Top} className="!border-slate-600" />
      <div className="text-lg font-bold">{data.label}</div>
      <div className="text-xs text-slate-400">{data.rank}</div>
      <div className={`mt-2 mx-auto w-2.5 h-2.5 rounded-full ${data.online ? 'bg-green-400' : 'bg-red-400'}`} />
      <Handle type="source" position={Position.Bottom} className="!border-slate-600" />
    </div>
  );
}

const nodeTypes = { employee: EmployeeNode };

function OrganogramPage({ onChat }: { onChat: (id: string) => void }) {
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: api.employees.list });
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [selectedNode, setSelectedNode] = useState<Employee | null>(null);

  useEffect(() => {
    if (!employees) return;

    const nodes = employees.map((emp) => ({
      id: emp.id,
      type: 'employee',
      position: { x: emp.positionX || 0, y: emp.positionY || 0 },
      data: {
        label: emp.name,
        rank: emp.rank,
        color: getRankColor(emp.rank),
        online: emp.status === 'online',
        employeeId: emp.id,
      },
    }));
    setRfNodes(nodes);

    const edges = employees
      .filter((e: Employee) => e.supervisorId)
      .map((e: Employee) => ({
        id: `${e.supervisorId}-${e.id}`,
        source: e.supervisorId!,
        target: e.id,
        type: 'smoothstep' as const,
        animated: true,
        style: { stroke: '#475569', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
      }));
    setRfEdges(edges);
  }, [employees]);

  const onNodeClick = useCallback((_event: any, node: any) => {
    const emp = employees?.find((e: Employee) => e.id === node.id);
    if (emp) setSelectedNode(emp);
  }, [employees]);

  const onNodeDragStop = useCallback((_event: any, node: any) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      api.employees.update(node.id, { positionX: node.position.x, positionY: node.position.y });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    }, 500);
  }, []);

  return (
    <div className="p-6 h-full flex gap-6">
      <div className="flex-1" style={{ height: '80vh' }}>
        <h2 className="text-2xl font-bold mb-4">Struktur Organisasi</h2>
        <p className="text-sm text-slate-400 mb-4">Drag node untuk reposition. Klik node untuk detail & chat.</p>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.3}
          maxZoom={2}
          deleteKeyCode={null}
          className="bg-slate-900/50 rounded-xl border border-slate-700"
        >
          <Background color="#334155" gap={20} />
          <Controls className="!bg-slate-800 !border-slate-700 !text-slate-300" />
        </ReactFlow>
      </div>

      {selectedNode && (
        <div className="w-80 bg-slate-800 rounded-xl p-4 border border-slate-700 self-start">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">{selectedNode.name}</h3>
            <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <p className="text-sm text-slate-400 mb-2">{selectedNode.rank}</p>
          <p className="text-sm mb-4">{selectedNode.jobDesc}</p>
          <button
            onClick={() => onChat(selectedNode.id)}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
          >
            Chat
          </button>
        </div>
      )}
    </div>
  );
}

function KanbanPage() {
  const queryClient = useQueryClient();
  const { data: columns } = useQuery({ queryKey: ['kanban-columns'], queryFn: api.kanban.columns.list });
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: api.employees.list });
  const [showAddTask, setShowAddTask] = useState<string | null>(null);
  const [showAddCol, setShowAddCol] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');
  const [newTask, setNewTask] = useState({ title: '', description: '', employeeId: '', priority: 'medium' });

  const addColumn = async () => {
    if (!newColTitle.trim()) return;
    await api.kanban.columns.create(newColTitle);
    queryClient.invalidateQueries({ queryKey: ['kanban-columns'] });
    setNewColTitle('');
    setShowAddCol(false);
  };

  const addTask = async (columnId: string) => {
    if (!newTask.title.trim()) return;
    await api.kanban.tasks.create({ ...newTask, columnId });
    queryClient.invalidateQueries({ queryKey: ['kanban-columns'] });
    setNewTask({ title: '', description: '', employeeId: '', priority: 'medium' });
    setShowAddTask(null);
  };

  const moveTask = async (taskId: string, newColumnId: string) => {
    await api.kanban.tasks.update(taskId, { columnId: newColumnId });
    queryClient.invalidateQueries({ queryKey: ['kanban-columns'] });
  };

  const deleteTask = async (taskId: string) => {
    await api.kanban.tasks.delete(taskId);
    queryClient.invalidateQueries({ queryKey: ['kanban-columns'] });
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-slate-600',
    medium: 'bg-yellow-600',
    high: 'bg-orange-600',
    urgent: 'bg-red-600',
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Kanban Board</h2>
        <button
          onClick={() => setShowAddCol(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
        >
          + Column
        </button>
      </div>

      {showAddCol && (
        <div className="mb-4 flex gap-2">
          <input
            value={newColTitle}
            onChange={(e) => setNewColTitle(e.target.value)}
            placeholder="Nama column..."
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && addColumn()}
          />
          <button onClick={addColumn} className="px-3 py-2 bg-green-600 rounded-lg text-sm">Tambah</button>
          <button onClick={() => setShowAddCol(false)} className="px-3 py-2 bg-slate-700 rounded-lg text-sm">Batal</button>
        </div>
      )}

      <div className="flex gap-4 overflow-auto pb-4" style={{ minHeight: '60vh' }}>
        {columns?.map((col: any) => (
          <div key={col.id} className="bg-slate-800 rounded-xl p-4 min-w-[280px] max-w-[280px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{col.title}</h3>
              <span className="text-xs text-slate-400">{col.tasks?.length || 0}</span>
            </div>

            <div className="flex-1 space-y-2">
              {col.tasks?.map((task: any) => (
                <div
                  key={task.id}
                  draggable
                  onDragEnd={(e) => {
                    const colEl = (e.target as HTMLElement).closest('[data-column]');
                    if (colEl) {
                      const newColId = colEl.getAttribute('data-column');
                      if (newColId && newColId !== col.id) moveTask(task.id, newColId);
                    }
                  }}
                  className="bg-slate-700 rounded-lg p-3 cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-[10px] px-2 py-0.5 rounded-full text-white ${priorityColors[task.priority] || priorityColors.medium}`}>
                      {task.priority}
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="text-slate-500 hover:text-red-400 text-xs">✕</button>
                  </div>
                  <p className="text-sm font-medium">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-slate-400 mt-1">{task.description}</p>
                  )}
                  {task.employee && (
                    <p className="text-xs text-slate-500 mt-2">@{task.employee.name}</p>
                  )}
                </div>
              ))}
            </div>

            {showAddTask === col.id ? (
              <div className="mt-3 space-y-2">
                <input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Judul task..."
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm"
                />
                <input
                  value={newTask.description || ''}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Deskripsi..."
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm"
                />
                <select
                  value={newTask.employeeId}
                  onChange={(e) => setNewTask({ ...newTask, employeeId: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm"
                >
                  <option value="">Pilih karyawan</option>
                  {employees?.map((emp: Employee) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button onClick={() => addTask(col.id)} className="flex-1 px-3 py-1 bg-green-600 rounded text-xs">Tambah</button>
                  <button onClick={() => setShowAddTask(null)} className="px-3 py-1 bg-slate-700 rounded text-xs">Batal</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddTask(col.id)}
                className="mt-3 w-full py-2 text-sm text-slate-400 hover:text-white border border-dashed border-slate-600 rounded-lg"
              >
                + Task
              </button>
            )}
            <div data-column={col.id} className="hidden" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FilesPage() {
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: api.employees.list });
  const [selectedEmp, setSelectedEmp] = useState<string | null>(null);
  const { data: files, refetch } = useQuery({
    queryKey: ['files', selectedEmp],
    queryFn: () => api.files.list(selectedEmp!),
    enabled: !!selectedEmp,
  });
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const { data: fileContent } = useQuery({
    queryKey: ['file-content', selectedEmp, previewFile],
    queryFn: () => api.files.read(selectedEmp!, previewFile || undefined),
    enabled: !!selectedEmp && !!previewFile,
  });

  const getFileName = (p: string) => p.split('/').pop() || p;

  return (
    <div className="p-6 flex gap-6 h-full">
      <div className="w-64 space-y-2">
        <h2 className="text-xl font-bold mb-4">File Manager</h2>
        {employees?.map((emp: Employee) => (
          <button
            key={emp.id}
            onClick={() => { setSelectedEmp(emp.id); setPreviewFile(null); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
              selectedEmp === emp.id ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            📁 {emp.name}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {!selectedEmp ? (
          <div className="text-center text-slate-500 mt-20">Pilih karyawan untuk lihat file</div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl p-4">
              <h3 className="font-semibold mb-3">File System</h3>
              {files?.filesystem?.length > 0 ? (
                <div className="space-y-1">
                  {files.filesystem.map((fp: string) => (
                    <button
                      key={fp}
                      onClick={() => setPreviewFile(fp)}
                      className={`w-full text-left px-3 py-1.5 rounded text-sm hover:bg-slate-700 ${
                        previewFile === fp ? 'bg-slate-700 text-blue-400' : 'text-slate-300'
                      }`}
                    >
                      📄 {getFileName(fp)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Belum ada file</p>
              )}
            </div>

            {previewFile && fileContent && (
              <div className="bg-slate-800 rounded-xl p-4">
                <h3 className="font-semibold mb-3 text-sm text-slate-400">
                  Preview: {getFileName(previewFile)}
                </h3>
                <pre className="text-sm text-slate-300 whitespace-pre-wrap max-h-96 overflow-auto">
                  {fileContent.content || '(binary file)'}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LogsPage() {
  const [filters, setFilters] = useState({ actor: '', action: '', date: '' });
  const { data, isLoading } = useQuery({
    queryKey: ['logs', filters],
    queryFn: () => api.logs.list(filters),
  });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Audit Log</h2>

      <div className="flex gap-4 mb-6">
        <input
          value={filters.date}
          onChange={(e) => setFilters({ ...filters, date: e.target.value })}
          type="date"
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={filters.actor}
          onChange={(e) => setFilters({ ...filters, actor: e.target.value })}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Semua Aktor</option>
          <option value="Bos">Bos</option>
          <option value="System">System</option>
        </select>
        <select
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Semua Aksi</option>
          <option value="Job trigger">Job trigger</option>
          <option value="Job error">Job error</option>
          <option value="Chat">Chat</option>
          <option value="Turn ON/OFF">Turn ON/OFF</option>
          <option value="CRUD">CRUD</option>
          <option value="Edit job">Edit job</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-slate-400">Loading...</div>
      ) : (
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left p-3 text-slate-400 font-medium">Waktu</th>
                <th className="text-left p-3 text-slate-400 font-medium">Aktor</th>
                <th className="text-left p-3 text-slate-400 font-medium">Aksi</th>
                <th className="text-left p-3 text-slate-400 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {data?.logs?.map((log: any) => (
                <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/50">
                  <td className="p-3 text-slate-400 text-xs">
                    {new Date(log.createdAt).toLocaleString('id-ID')}
                  </td>
                  <td className="p-3">{log.actor}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-slate-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300">{log.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BroadcastPage() {
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

function JobsPage() {
  const queryClient = useQueryClient();
  const { data: jobs } = useQuery({ queryKey: ['jobs'], queryFn: api.jobs.list });
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: api.employees.list });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ employeeId: '', name: '', schedule: '0 8 * * *', prompt: '' });

  const addJob = async () => {
    if (!form.employeeId || !form.name || !form.prompt) return;
    await api.jobs.create(form);
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
    setForm({ employeeId: '', name: '', schedule: '0 8 * * *', prompt: '' });
    setShowAdd(false);
  };

  const runJob = async (id: string) => {
    await api.jobs.runNow(id);
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
  };

  const toggleJob = async (job: any) => {
    await api.jobs.update(job.id, { ...job, status: job.status === 'active' ? 'inactive' : 'active' });
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
  };

  const deleteJob = async (id: string) => {
    await api.jobs.delete(id);
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Daily Jobs</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
        >
          + Job
        </button>
      </div>

      {showAdd && (
        <div className="bg-slate-800 rounded-xl p-4 mb-6 space-y-3">
          <select
            value={form.employeeId}
            onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Pilih Karyawan</option>
            {employees?.map((emp: Employee) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nama Job"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={form.schedule}
            onChange={(e) => setForm({ ...form, schedule: e.target.value })}
            placeholder="Cron expression: 0 8 * * *"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            value={form.prompt}
            onChange={(e) => setForm({ ...form, prompt: e.target.value })}
            placeholder="Prompt untuk AI..."
            rows={3}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm resize-none"
          />
          <div className="flex gap-2">
            <button onClick={addJob} className="px-4 py-2 bg-green-600 rounded-lg text-sm">Simpan</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-slate-700 rounded-lg text-sm">Batal</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {jobs?.map((job: any) => (
          <div key={job.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">{job.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  job.status === 'active' ? 'bg-green-600' : 'bg-slate-600'
                }`}>
                  {job.status === 'active' ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => runJob(job.id)} className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded-lg">Run Now</button>
                <button onClick={() => toggleJob(job)} className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg">
                  {job.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button onClick={() => deleteJob(job.id)} className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 rounded-lg">Hapus</button>
              </div>
            </div>
            <div className="text-sm text-slate-400">
              <span>{job.employee?.name} — {job.schedule}</span>
            </div>
            <p className="text-sm text-slate-300 mt-1">{job.prompt}</p>
            {job.lastRun && (
              <div className="mt-2 text-xs text-slate-500">
                Terakhir: {new Date(job.lastRun).toLocaleString('id-ID')} — {job.lastResult === 'success' ? '✅' : '❌'} {job.lastResult}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: api.employees.list });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', rank: 'Junior', jobDesc: '', model: 'opencode/big-pickle', supervisorId: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const addEmployee = async () => {
    if (!form.name || !form.jobDesc) return;
    await api.employees.create({ ...form, supervisorId: form.supervisorId || undefined });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    setForm({ name: '', rank: 'Junior', jobDesc: '', model: 'opencode/big-pickle', supervisorId: '' });
    setShowAdd(false);
  };

  const updateEmployee = async (id: string) => {
    await api.employees.update(id, { ...form, supervisorId: form.supervisorId || null });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    setForm({ name: '', rank: 'Junior', jobDesc: '', model: 'opencode/big-pickle', supervisorId: '' });
    setEditingId(null);
  };

  const deleteEmployee = async (id: string) => {
    if (!confirm('Yakin hapus?')) return;
    await api.employees.delete(id);
    queryClient.invalidateQueries({ queryKey: ['employees'] });
  };

  const startEdit = (emp: Employee) => {
    setForm({ name: emp.name, rank: emp.rank, jobDesc: emp.jobDesc, model: emp.model, supervisorId: emp.supervisorId || '' });
    setEditingId(emp.id);
    setShowAdd(false);
  };

  const models = [
    'opencode/big-pickle',
    'opencode/deepseek-v4-flash-free',
    'opencode/nemotron-3-ultra-free',
    'opencode/north-mini-code-free',
    'opencode/mimo-v2.5-free',
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Manajemen Karyawan</h2>
        <button
          onClick={() => { setShowAdd(true); setEditingId(null); setForm({ name: '', rank: 'Junior', jobDesc: '', model: 'opencode/big-pickle', supervisorId: '' }); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
        >
          + Karyawan
        </button>
      </div>

      {(showAdd || editingId) && (
        <div className="bg-slate-800 rounded-xl p-6 mb-6 space-y-4 max-w-lg">
          <h3 className="font-semibold">{editingId ? 'Edit Karyawan' : 'Tambah Karyawan'}</h3>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nama"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={form.rank}
            onChange={(e) => setForm({ ...form, rank: e.target.value })}
            placeholder="Pekerjaan (cth: CEO, CTO, Frontend Developer)"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            value={form.jobDesc}
            onChange={(e) => setForm({ ...form, jobDesc: e.target.value })}
            placeholder="Job Description (akan jadi system prompt)"
            rows={3}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm resize-none"
          />
          <select
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
          >
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Atasan</label>
            <select
              value={form.supervisorId}
              onChange={(e) => setForm({ ...form, supervisorId: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Tidak Ada</option>
              {employees?.filter((e: Employee) => e.id !== editingId).map((emp: Employee) => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.rank})</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={editingId ? () => updateEmployee(editingId) : addEmployee}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm"
            >
              {editingId ? 'Simpan' : 'Tambah'}
            </button>
            <button onClick={() => { setShowAdd(false); setEditingId(null); }} className="px-4 py-2 bg-slate-700 rounded-lg text-sm">Batal</button>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left p-3 text-slate-400 font-medium">Nama</th>
              <th className="text-left p-3 text-slate-400 font-medium">Jabatan</th>
              <th className="text-left p-3 text-slate-400 font-medium">Atasan</th>
              <th className="text-left p-3 text-slate-400 font-medium">Model</th>
              <th className="text-left p-3 text-slate-400 font-medium">Port</th>
              <th className="text-left p-3 text-slate-400 font-medium">Status</th>
              <th className="text-left p-3 text-slate-400 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {employees?.map((emp: Employee) => (
              <tr key={emp.id} className="border-b border-slate-700/50 hover:bg-slate-700/50">
                <td className="p-3 font-medium">{emp.name}</td>
                <td className="p-3 text-slate-400">{emp.rank}</td>
                <td className="p-3 text-xs text-slate-400">{employees?.find((e: Employee) => e.id === emp.supervisorId)?.name || '-'}</td>
                <td className="p-3 text-xs text-slate-400">{emp.model}</td>
                <td className="p-3 text-slate-400">{emp.port}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    emp.status === 'online' ? 'bg-green-600' : 'bg-red-600'
                  }`}>
                    {emp.status}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(emp)} className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded">Edit</button>
                    <button onClick={() => deleteEmployee(emp.id)} className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded">Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
