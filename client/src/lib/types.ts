export interface Employee {
  id: string;
  name: string;
  rank: string;
  jobDesc: string;
  model: string;
  status: string;
  supervisorId: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface Note {
  id: string;
  title: string;
  content: string;
  employeeId: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: Employee | null;
}
