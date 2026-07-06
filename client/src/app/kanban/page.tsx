'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Employee } from '@/lib/types';

export default function KanbanPage() {
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
