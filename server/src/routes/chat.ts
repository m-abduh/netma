import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { chatWithEmployee, createSessionAsync, pollMessageParts, deleteSession } from '../services/opencode';
import { getProcessManager } from '../services/processManager';

const router = Router();

async function ensureOnline(prisma: PrismaClient, employee: { id: string; port: number; status: string }) {
  if (employee.status === 'online') return;
  const pm = getProcessManager();
  if (!pm.isRunning(employee.port)) {
    await pm.start(employee as any);
  }
  await prisma.employee.update({ where: { id: employee.id }, data: { status: 'online' } });
}

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
  try {
    await ensureOnline(prisma, employee);
  } catch (err: any) {
    return res.status(500).json({ error: `Failed to turn on: ${err.message}` });
  }

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  await prisma.chat.create({
    data: { employeeId: employee.id, role: 'user', content: prompt },
  });

  try {
    if (!employee.port) throw new Error('Employee has no port assigned');

    const empWithHierarchy = await enrichEmployee(prisma, employee);

    req.setTimeout(180000);
    const reply = await chatWithEmployee(empWithHierarchy, prompt);

    await prisma.chat.create({
      data: { employeeId: employee.id, role: 'assistant', content: reply },
    });

    res.json({ role: 'assistant', content: reply });
  } catch (err: any) {
    res.status(502).json({ error: `Failed to reach opencode: ${err.message}` });
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

  const { prompt } = req.body;
  if (!prompt) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Prompt is required' }));
    return;
  }

  try {
    await ensureOnline(prisma, employee);
  } catch (err: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Failed to turn on: ${err.message}` }));
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  await prisma.chat.create({
    data: { employeeId: employee.id, role: 'user', content: prompt },
  });

  let lastText = '';
  let lastReasoning = '';
  let sessionId: string | null = null;

  try {
    if (!employee.port) throw new Error('Employee has no port assigned');
    const empWithHierarchy = await enrichEmployee(prisma, employee);
    sessionId = await createSessionAsync(empWithHierarchy, prompt);

    for (let i = 0; i < 360; i++) {
      const { text, reasoning, isComplete } = await pollMessageParts(employee.port, sessionId);
      const newReasoning = reasoning.slice(lastReasoning.length);

      // Reasoning dikirim progresif pas polling
      if (newReasoning) {
        res.write(`data: ${JSON.stringify({ type: 'delta', text: '', reasoning: newReasoning })}\n\n`);
        lastReasoning = reasoning;
      }

      // Text baru tersedia saat isComplete true — streaming word-by-word
      if (isComplete) {
        lastText = text;
        // Stream text per kata
        const delay = text.length > 200 ? 8 : 15;
        const chunks = text.split(/(\s+)/).filter(Boolean);
        for (const chunk of chunks) {
          res.write(`data: ${JSON.stringify({ type: 'delta', text: chunk, reasoning: '' })}\n\n`);
          await new Promise((r) => setTimeout(r, delay));
        }
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    if (lastText) {
      await prisma.chat.create({
        data: { employeeId: employee.id, role: 'assistant', content: lastText },
      });
    }

    res.write(`data: ${JSON.stringify({ type: 'done', text: lastText, reasoning: lastReasoning })}\n\n`);
    res.end();
  } catch (err: any) {
    try {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    } catch {}
    try { res.end(); } catch {}
  } finally {
    if (sessionId && employee.port) {
      deleteSession(employee.port, sessionId);
    }
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

  await Promise.all(subordinates.map((sub) => ensureOnline(prisma, sub).catch(() => {})));

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
        const reply = await chatWithEmployee(enrichedSub, msg);
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
