'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '@/lib/api';
import { useStore } from '@/store';
import type { Employee } from '@/lib/types';

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

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/---/g, '')
    .replace(/___/g, '')
    .replace(/\*\*\*/g, '')
    .replace(/> /g, '')
    .replace(/^#+\s/gm, '')
    .replace(/^\s*[-*+]\s/gm, '')
    .replace(/^\s*\d+\.\s/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

function EmployeeNode({ data }: { data: any }) {
  return (
    <div
      className="px-4 py-3 rounded-xl border-2 text-center shadow-lg cursor-pointer"
      style={{ borderColor: data.color, backgroundColor: '#1e293b', minWidth: 180, position: 'relative' }}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} className="!border-slate-600" />
      <div className="text-lg font-bold">{data.label}</div>
      <div className="text-xs text-slate-400">{data.rank}</div>
      <div className={`mt-2 mx-auto w-2.5 h-2.5 rounded-full ${data.online ? 'bg-green-400' : 'bg-red-400'}`} />
      {data.lastChat && (
        <div className="mt-2 text-[10px] text-slate-500 leading-tight line-clamp-3 max-w-[160px] mx-auto">
          {stripMarkdown(data.lastChat)}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} isConnectable={false} className="!border-slate-600" />
    </div>
  );
}

const nodeTypes = { employee: EmployeeNode };

export default function DashboardPage() {
  const router = useRouter();
  const { setActiveChat } = useStore();
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: api.employees.list });
  const { data: recentChats } = useQuery({ queryKey: ['recent-chats'], queryFn: api.chat.recent });
  const [rfNodes, setRfNodes] = useState<Node[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge[]>([]);
  const initialized = useRef(false);
  const savedPositions = useRef<Record<string, { x: number; y: number }>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setRfNodes((prev) => applyNodeChanges(changes, prev)),
    [],
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setRfEdges((prev) => applyEdgeChanges(changes, prev)),
    [],
  );

  useEffect(() => {
    if (!employees || !recentChats) return;
    if (initialized.current) return;
    initialized.current = true;

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
        lastChat: recentChats?.[emp.id]?.content ? stripMarkdown(recentChats[emp.id].content) : null,
      },
    }));
    nodes.forEach((n) => { savedPositions.current[n.id] = { ...n.position }; });
    setRfNodes(nodes);

    setRfEdges(
      employees
        .filter((e: Employee) => e.supervisorId)
        .map((e: Employee) => ({
          id: `${e.supervisorId}-${e.id}`,
          source: e.supervisorId!,
          target: e.id,
        }))
    );
  }, [employees, recentChats]);

  const onNodeClick = useCallback((_event: any, node: any) => {
    setActiveChat(node.id);
    router.push('/chat');
  }, [setActiveChat, router]);

  const savePositions = async () => {
    setSaving(true);
    try {
      await Promise.all(rfNodes.map((n) =>
        api.employees.update(n.id, { positionX: Math.round(n.position.x), positionY: Math.round(n.position.y) })
      ));
      rfNodes.forEach((n) => { savedPositions.current[n.id] = { ...n.position }; });
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  const cancelChanges = () => {
    setRfNodes((prev) => prev.map((n) => {
      const saved = savedPositions.current[n.id];
      return saved ? { ...n, position: { ...saved } } : n;
    }));
    setHasChanges(false);
  };

  const handleNodeDragStop = useCallback(() => {
    setHasChanges(true);
  }, []);

  const online = employees?.filter((e: Employee) => e.status === 'online').length || 0;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 bg-slate-800/50 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <div className="flex gap-2 text-xs">
            <span className="bg-slate-800 px-3 py-1 rounded-lg">Total: {employees?.length || 0}</span>
            <span className="bg-slate-800 px-3 py-1 rounded-lg text-green-400">Online: {online}</span>
            <span className="bg-slate-800 px-3 py-1 rounded-lg text-red-400">Offline: {(employees?.length || 0) - online}</span>
          </div>
        </div>
        {hasChanges && (
          <div className="flex gap-2">
            <button onClick={cancelChanges} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">Batal</button>
            <button onClick={savePositions} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm disabled:opacity-50">
              {saving ? 'Menyimpan...' : 'Simpan Posisi'}
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeDragStop={handleNodeDragStop}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.3}
          maxZoom={2}
          onlyRenderVisibleElements={false}
          defaultEdgeOptions={{ type: 'smoothstep', animated: true, style: { stroke: '#475569', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' } }}
          deleteKeyCode={null}
          className="bg-slate-900"
        >
          <Background color="#334155" gap={20} />
          <Controls
            className="!bg-black !border-0 !shadow-lg rounded-lg overflow-hidden"
            style={{ backgroundColor: '#000', border: 'none' }}
          >
            <style jsx global>{`
              .react-flow__attribution { display: none !important; }
              .react-flow__controls { background: #000 !important; border: none !important; border-radius: 8px !important; box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important; }
              .react-flow__controls button { color: #94a3b8 !important; background: transparent !important; }
              .react-flow__controls button path { fill: #94a3b8 !important; stroke: #94a3b8 !important; }
              .react-flow__controls button svg { color: #94a3b8 !important; fill: #94a3b8 !important; }
            `}</style>
          </Controls>
        </ReactFlow>
      </div>
    </div>
  );
}