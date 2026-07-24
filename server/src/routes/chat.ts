import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { chatWithEmployee } from '../services/chat-service';

const router = Router();

async function enrichEmployee(prisma: PrismaClient, emp: any) {
  const supervisor = emp.supervisorId ? await prisma.employee.findUnique({ where: { id: emp.supervisorId } }) : null;
  const subordinates = await prisma.employee.findMany({ where: { supervisorId: emp.id } });
  return {
    ...emp,
    supervisorName: supervisor?.name,
    supervisorRank: supervisor?.rank,
    subordinates: subordinates.map((s: any) => ({ name: s.name, rank: s.rank })),
  };
}

router.post('/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  const { prompt, mode } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  await prisma.chat.create({
    data: { employeeId: employee.id, role: 'user', content: prompt },
  });

  try {
    const empWithHierarchy = await enrichEmployee(prisma, employee);
    const recentChats = await prisma.chat.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
    const history = recentChats.map(c => ({ role: c.role, content: c.content }));

    req.setTimeout(180000);
    const reply = await chatWithEmployee(empWithHierarchy, prompt, mode, history);

    await prisma.chat.create({
      data: { employeeId: employee.id, role: 'assistant', content: reply },
    });

    res.json({ role: 'assistant', content: reply });
  } catch (err: any) {
    res.status(502).json({ error: `Failed to chat: ${err.message}` });
  }
});

router.post('/:id/stream', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Employee not found' }));
    return;
  }

  const { prompt, mode } = req.body;
  if (!prompt) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Prompt is required' }));
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  req.setTimeout(300000);

  res.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`);

  await prisma.chat.create({
    data: { employeeId: employee.id, role: 'user', content: prompt },
  });

  try {
    const empWithHierarchy = await enrichEmployee(prisma, employee);
    const recentChats = await prisma.chat.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
    const history = recentChats.map(c => ({ role: c.role, content: c.content }));

    const reply = await chatWithEmployee(empWithHierarchy, prompt, mode, history);

    await prisma.chat.create({
      data: { employeeId: employee.id, role: 'assistant', content: reply },
    });

    if (reply) {
      res.write(`data: ${JSON.stringify({ type: 'delta', text: reply })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ type: 'done', text: reply })}\n\n`);
    res.end();
  } catch (err: any) {
    try {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    } catch {}
    try { res.end(); } catch {}
  }
});

router.post('/:id/broadcast-to-subordinates', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  const { prompt, response } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  const subordinates = await prisma.employee.findMany({ where: { supervisorId: employee.id } });
  if (subordinates.length === 0) return res.json({ results: [] });

  const msg = `📢 **Broadcast dari ${employee.name}**\n\n**Instruksi Bos:** ${prompt}\n\n**Rencana ${employee.name}:**${response ? '\n' + response : ''}\n\n*Tugasmu: buatlah rencana detail untuk bagianmu.*`;

  await Promise.all(subordinates.map((sub) =>
    prisma.chat.create({ data: { employeeId: sub.id, role: 'user', content: msg } })
  ));

  await prisma.auditLog.create({
    data: { actor: 'Bos', action: 'Broadcast', target: employee.id, detail: `Broadcast ke ${subordinates.length} bawahan` },
  });

  res.json({ success: true, count: subordinates.length, names: subordinates.map((s: any) => s.name) });

  subordinates.forEach((sub) => {
    (async () => {
      try {
        const enrichedSub = await enrichEmployee(prisma, sub);
        const subHistory = await prisma.chat.findMany({
          where: { employeeId: sub.id },
          orderBy: { createdAt: 'asc' },
          take: 20,
        });
        const reply = await chatWithEmployee(enrichedSub, msg, undefined, subHistory.map(c => ({ role: c.role, content: c.content })));
        await prisma.chat.create({ data: { employeeId: sub.id, role: 'assistant', content: reply } });
      } catch (err: any) {
        console.error(`Broadcast reply failed for ${sub.name}: ${err.message}`);
      }
    })();
  });
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
    orderBy: { createdAt: 'desc' },
  });
  res.json(chats);
});

router.delete('/:id/history', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  await prisma.chat.deleteMany({ where: { employeeId: req.params.id } });
  res.json({ success: true });
});

export { router as chatRouter };
