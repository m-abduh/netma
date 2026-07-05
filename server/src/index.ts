import express from 'express';
import cors from 'cors';
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
