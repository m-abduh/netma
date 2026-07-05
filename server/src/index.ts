import express from 'express';
import cors from 'cors';
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

app.use('/api/edges', async (req, res) => {
  if (req.method === 'GET') {
    const edges = await prisma.edge.findMany();
    return res.json(edges);
  }
  if (req.method === 'POST') {
    const { fromId, toId } = req.body;
    const edge = await prisma.edge.create({ data: { fromId, toId } });
    return res.json(edge);
  }
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (id) {
      await prisma.edge.delete({ where: { id: String(id) } });
      return res.json({ success: true });
    }
    const { fromId, toId } = req.body;
    const edge = await prisma.edge.findFirst({ where: { fromId, toId } });
    if (edge) {
      await prisma.edge.delete({ where: { id: edge.id } });
    }
    return res.json({ success: true });
  }
  res.status(405).json({ error: 'Method not allowed' });
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

  initScheduler(prisma);
  app.listen(PORT, () => {
    console.log(`Netma server running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
