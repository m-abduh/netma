import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { chatWithEmployee } from '../services/opencode';

const router = Router();

router.post('/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  if (employee.status !== 'online') return res.status(400).json({ error: 'Employee is offline' });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  await prisma.chat.create({
    data: { employeeId: employee.id, role: 'user', content: prompt },
  });

  try {
    if (!employee.port) throw new Error('Employee has no port assigned');

    req.setTimeout(180000);
    const reply = await chatWithEmployee(employee, prompt);

    await prisma.chat.create({
      data: { employeeId: employee.id, role: 'assistant', content: reply },
    });

    res.json({ role: 'assistant', content: reply });
  } catch (err: any) {
    res.status(502).json({ error: `Failed to reach opencode: ${err.message}` });
  }
});

router.get('/:id/event', (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { id } = req.params;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const interval = setInterval(async () => {
    try {
      const chats = await prisma.chat.findMany({
        where: { employeeId: id },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      if (chats.length > 0) {
        res.write(`data: ${JSON.stringify(chats[0])}\n\n`);
      }
    } catch {
      clearInterval(interval);
      res.end();
    }
  }, 2000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

router.get('/recent', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const employees = await prisma.employee.findMany({ select: { id: true } });
  const result: Record<string, any> = {};

  for (const emp of employees) {
    const last = await prisma.chat.findFirst({
      where: { employeeId: emp.id, role: 'assistant' },
      orderBy: { createdAt: 'desc' },
    });
    if (last) result[emp.id] = last;
  }

  res.json(result);
});

router.get('/:id/history', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const chats = await prisma.chat.findMany({
    where: { employeeId: req.params.id },
    orderBy: { createdAt: 'asc' },
  });
  res.json(chats);
});

export { router as chatRouter };
