const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  return res.json();
}

export const api = {
  employees: {
    list: () => request<any[]>('/api/employees'),
    get: (id: string) => request<any>(`/api/employees/${id}`),
    create: (data: any) => request<any>('/api/employees', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/api/employees/${id}`, { method: 'DELETE' }),
    turnOn: (id: string) => request<any>(`/api/employees/${id}/turn-on`, { method: 'POST' }),
    turnOff: (id: string) => request<any>(`/api/employees/${id}/turn-off`, { method: 'POST' }),
  },
  edges: {
    list: () => request<any[]>('/api/edges'),
    create: (fromId: string, toId: string) => request<any>('/api/edges', { method: 'POST', body: JSON.stringify({ fromId, toId }) }),
    delete: (fromId: string, toId: string) => request<any>('/api/edges', { method: 'DELETE', body: JSON.stringify({ fromId, toId }) }),
  },
  chat: {
    send: (employeeId: string, prompt: string) => request<any>(`/api/chat/${employeeId}`, { method: 'POST', body: JSON.stringify({ prompt }) }),
    history: (employeeId: string) => request<any[]>(`/api/chat/${employeeId}/history`),
    recent: () => request<Record<string, any>>('/api/chat/recent'),
  },
  jobs: {
    list: () => request<any[]>('/api/jobs'),
    create: (data: any) => request<any>('/api/jobs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/api/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/api/jobs/${id}`, { method: 'DELETE' }),
    runNow: (id: string) => request<any>(`/api/jobs/${id}/run-now`, { method: 'POST' }),
  },
  broadcast: {
    send: (prompt: string) => request<any>('/api/broadcast', { method: 'POST', body: JSON.stringify({ prompt }) }),
  },
  logs: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any>(`/api/logs${qs}`);
    },
  },
  files: {
    list: (employeeId: string) => request<any>(`/api/employees/${employeeId}/files`),
    read: (employeeId: string, filepath?: string, id?: string) => {
      const params = new URLSearchParams();
      if (filepath) params.set('filepath', filepath);
      if (id) params.set('id', id);
      return request<any>(`/api/employees/${employeeId}/files/read?${params.toString()}`);
    },
  },
  kanban: {
    columns: {
      list: () => request<any[]>('/api/kanban/columns'),
      create: (title: string) => request<any>('/api/kanban/columns', { method: 'POST', body: JSON.stringify({ title }) }),
      update: (id: string, data: any) => request<any>(`/api/kanban/columns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) => request<any>(`/api/kanban/columns/${id}`, { method: 'DELETE' }),
    },
    tasks: {
      list: () => request<any[]>('/api/kanban/tasks'),
      create: (data: any) => request<any>('/api/kanban/tasks', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: any) => request<any>(`/api/kanban/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) => request<any>(`/api/kanban/tasks/${id}`, { method: 'DELETE' }),
    },
  },
};
