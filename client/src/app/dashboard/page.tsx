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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
      style={{ borderColor: data.color, backgroundColor: 'hsl(var(--card))', minWidth: 180, position: 'relative' }}
    >
      <Handle type="target" position={Position.Top} isConnectable={true} className="!border-border !bg-background !w-3 !h-3" />
      <div className="text-lg font-bold">{data.label}</div>
      <div className="text-xs text-muted-foreground">{data.rank}</div>
      <div className={cn('mt-2 mx-auto w-2.5 h-2.5 rounded-full', data.online ? 'bg-green-400' : 'bg-red-400')} />
      {data.lastChat && (
        <div className="mt-2 text-[10px] text-muted-foreground leading-tight line-clamp-3 max-w-[160px] mx-auto">
          {stripMarkdown(data.lastChat)}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} isConnectable={true} className="!border-border !bg-background !w-3 !h-3" />
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
          animated: true,
          style: { stroke: '#888', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#888' },
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
      <div className="flex items-center justify-between p-4 bg-card/50 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <div className="flex gap-2">
            <Badge variant="outline">Total: {employees?.length || 0}</Badge>
            <Badge variant="outline" className="text-green-400 border-green-400/30">Online: {online}</Badge>
            <Badge variant="outline" className="text-red-400 border-red-400/30">Offline: {(employees?.length || 0) - online}</Badge>
          </div>
        </div>
        {hasChanges && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={cancelChanges}>Batal</Button>
            <Button variant="default" size="sm" onClick={savePositions} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Posisi'}
            </Button>
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
          defaultEdgeOptions={{ type: 'smoothstep', animated: true, style: { stroke: '#888', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#888' } }}
          isValidConnection={() => true}
          deleteKeyCode={null}
          className="bg-background"
        >
          <Background color="hsl(var(--muted))" gap={20} bgColor="hsl(var(--background))" />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}