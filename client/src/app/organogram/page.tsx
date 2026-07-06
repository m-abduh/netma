'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

function EmployeeNode({ data }: { data: any }) {
  return (
    <div
      className="px-4 py-3 rounded-xl border-2 text-center shadow-lg"
      style={{ borderColor: data.color, backgroundColor: '#1e293b', minWidth: 150, position: 'relative' }}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} className="!border-slate-600" />
      <div className="text-lg font-bold">{data.label}</div>
      <div className="text-xs text-slate-400">{data.rank}</div>
      <div className={`mt-2 mx-auto w-2.5 h-2.5 rounded-full ${data.online ? 'bg-green-400' : 'bg-red-400'}`} />
      <Handle type="source" position={Position.Bottom} isConnectable={false} className="!border-slate-600" />
    </div>
  );
}

const nodeTypes = { employee: EmployeeNode };

export default function OrganogramPage() {
  const router = useRouter();
  const { setActiveChat } = useStore();
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: api.employees.list });
  const [rfNodes, setRfNodes] = useState<Node[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge[]>([]);
  const queryClient = useQueryClient();
  const [selectedNode, setSelectedNode] = useState<Employee | null>(null);
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
    if (!employees || initialized.current) return;
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
  }, [employees]);

  const onNodeClick = useCallback((_event: any, node: any) => {
    const emp = employees?.find((e: Employee) => e.id === node.id);
    if (emp) setSelectedNode(emp);
  }, [employees]);

  const handleChat = (id: string) => {
    setActiveChat(id);
    router.push('/chat');
  };

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

  const handleNodeDragStop = useCallback((_event: any, node: any) => {
    setHasChanges(true);
  }, []);

  return (
    <div className="p-6 h-full flex gap-6">
      <div className="flex-1" style={{ height: '80vh' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Struktur Organisasi</h2>
            <p className="text-sm text-slate-400">Drag node untuk reposition. Klik node untuk detail & chat.</p>
          </div>
          {hasChanges && (
            <div className="flex gap-2">
              <button
                onClick={cancelChanges}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
              >
                Batal
              </button>
              <button
                onClick={savePositions}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan Posisi'}
              </button>
            </div>
          )}
        </div>
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
            onClick={() => handleChat(selectedNode.id)}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
          >
            Chat
          </button>
        </div>
      )}
    </div>
  );
}
