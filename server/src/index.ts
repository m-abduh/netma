import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import fsSync from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { employeesRouter } from './routes/employees';
import { chatRouter } from './routes/chat';
import { jobsRouter } from './routes/jobs';
import { broadcastRouter } from './routes/broadcast';
import { logsRouter } from './routes/logs';
import { filesRouter } from './routes/files';
import { kanbanRouter } from './routes/kanban';
import { initScheduler } from './services/scheduler';
import { getProjectDir } from './config';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  (req as any).prisma = prisma;
  next();
});

app.use('/api/employees', employeesRouter);
app.use('/api/chat', chatRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/broadcast', broadcastRouter);
app.use('/api/logs', logsRouter);
app.use('/api/employees/:id/files', filesRouter);
app.use('/api/kanban', kanbanRouter);

app.get('/api/edges', async (_req, res) => {
  const employees = await prisma.employee.findMany({ where: { NOT: { supervisorId: null } } });
  const edges = employees.map((e) => ({ id: `${e.supervisorId}-${e.id}`, fromId: e.supervisorId, toId: e.id }));
  res.json(edges);
});

app.get('/api/browse/list', async (req, res) => {
  const dir = (req.query.dir as string) || os.homedir();
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const items = await Promise.all(entries.map(async (e) => {
      const full = path.join(dir, e.name);
      let size = 0;
      if (e.isFile()) {
        try { const s = await fs.stat(full); size = s.size; } catch {}
      }
      return { name: e.name, type: e.isDirectory() ? 'dir' : 'file', size };
    }));
    items.sort((a, b) => (a.type === 'dir' ? 0 : 1) - (b.type === 'dir' ? 0 : 1) || a.name.localeCompare(b.name));
    res.json({ current: dir, parent: path.dirname(dir), items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/project-dir', (_req, res) => {
  res.json({ path: getProjectDir() });
});

app.put('/api/project-dir', (req, res) => {
  const { path: newPath } = req.body;
  if (!newPath) return res.status(400).json({ error: 'path required' });
  const configPath = path.join(__dirname, '../project-dir.json');
  try {
    fsSync.writeFileSync(configPath, JSON.stringify({ path: newPath }, null, 2));
    res.json({ path: getProjectDir() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/project-dir/list', async (req, res) => {
  const base = getProjectDir();
  const sub = (req.query.dir as string) || '';
  const target = path.join(base, sub);
  if (!target.startsWith(base)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const entries = await fs.readdir(target, { withFileTypes: true });
    const items = await Promise.all(entries.map(async (e) => {
      const full = path.join(target, e.name);
      let size = 0;
      if (e.isFile()) {
        try { const s = await fs.stat(full); size = s.size; } catch {}
      }
      return { name: e.name, type: e.isDirectory() ? 'dir' : 'file', size, path: sub ? `${sub}/${e.name}` : e.name };
    }));
    items.sort((a, b) => (a.type === 'dir' ? 0 : 1) - (b.type === 'dir' ? 0 : 1) || a.name.localeCompare(b.name));
    res.json({ path: base, current: sub, items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/project-dir/read', async (req, res) => {
  const base = getProjectDir();
  const filepath = req.query.file as string;
  if (!filepath) return res.status(400).json({ error: 'file query param required' });
  const target = path.join(base, filepath);
  if (!target.startsWith(base)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const content = await fs.readFile(target, 'utf-8');
    res.json({ path: target, content });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(express.static('../client/out'));

app.get('*', (_req, res) => {
  res.sendFile('index.html', { root: '../client/out' });
});

async function start() {
  await prisma.$connect();

  await prisma.employee.updateMany({ where: { status: 'online' }, data: { status: 'offline' } });

  try {
    execSync('pkill -f "opencode serve" 2>/dev/null; for p in $(seq 21000 21999); do fuser -k $p/tcp 2>/dev/null; done', { stdio: 'ignore' });
  } catch {}

  initScheduler(prisma);
  app.listen(PORT, () => {
    console.log(`Netma server running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
