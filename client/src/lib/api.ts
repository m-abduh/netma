const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

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
  },
  edges: {
    list: () => request<any[]>('/api/edges'),
  },
  chat: {
    send: (employeeId: string, prompt: string) => request<any>(`/api/chat/${employeeId}`, { method: 'POST', body: JSON.stringify({ prompt }) }),
    broadcastToSubordinates: (employeeId: string, prompt: string, response: string) =>
      request<any>(`/api/chat/${employeeId}/broadcast-to-subordinates`, { method: 'POST', body: JSON.stringify({ prompt, response }) }),
    history: (employeeId: string) => request<any[]>(`/api/chat/${employeeId}/history`),
    clearHistory: (employeeId: string) => request<any>(`/api/chat/${employeeId}/history`, { method: 'DELETE' }),
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
  projectDir: {
    info: () => request<any>('/api/project-dir'),
    update: (path: string) => request<any>('/api/project-dir', { method: 'PUT', body: JSON.stringify({ path }) }),
    list: (dir?: string) => request<any>(`/api/project-dir/list${dir ? `?dir=${encodeURIComponent(dir)}` : ''}`),
    read: (file: string) => request<any>(`/api/project-dir/read?file=${encodeURIComponent(file)}`),
  },
  browse: {
    list: (dir?: string) => request<any>(`/api/browse/list${dir ? `?dir=${encodeURIComponent(dir)}` : ''}`),
  },
  notes: {
    list: () => request<any[]>('/api/notes'),
    create: (data: any) => request<any>('/api/notes', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/api/notes/${id}`, { method: 'DELETE' }),
  },
};
