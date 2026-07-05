export interface Employee {
  id: string;
  name: string;
  rank: string;
  jobDesc: string;
  model: string;
  port: number;
  status: string;
  workStart: string;
  workEnd: string;
  positionX: number;
  positionY: number;
  createdAt: string;
  updatedAt: string;
}

export interface Edge {
  id: string;
  fromId: string;
  toId: string;
}

export interface Chat {
  id: string;
  employeeId: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface Job {
  id: string;
  employeeId: string;
  name: string;
  schedule: string;
  prompt: string;
  status: string;
  lastRun: string | null;
  lastResult: string | null;
  lastOutput: string | null;
  createdAt: string;
  employee?: Employee;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  target: string | null;
  detail: string | null;
  createdAt: string;
}

export interface FileEntry {
  id: string;
  employeeId: string;
  path: string;
  content: string;
  size: number;
  createdAt: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  order: number;
  tasks: KanbanTask[];
}

export interface KanbanTask {
  id: string;
  columnId: string;
  employeeId: string | null;
  title: string;
  description: string | null;
  priority: string;
  deadline: string | null;
  source: string;
  order: number;
  createdAt: string;
  employee?: Employee | null;
  column?: KanbanColumn;
}
