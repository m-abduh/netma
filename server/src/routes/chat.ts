import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { chatWithEmployee } from '../services/opencode';

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
  if (employee.status !== 'online') return res.status(400).json({ error: 'Employee is offline' });

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

router.post('/:id/broadcast-to-subordinates', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  const { prompt, response } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  const subordinates = await prisma.employee.findMany({ where: { supervisorId: employee.id, status: 'online' } });
  if (subordinates.length === 0) return res.json({ results: [] });

  const enriched = await enrichEmployee(prisma, employee);
  const contextPrompt = `[Pesan dari atasanmu ${employee.name}]\n\nInstruksi Bos: ${prompt}\n\nRencana ${employee.name}: ${response}\n\nTugasmu: buatlah rencana detail untuk bagianmu.`;

  const results: { id: string; name: string; success: boolean; output?: string; error?: string }[] = [];

  for (const sub of subordinates) {
    try {
      const empWithHierarchy = await enrichEmployee(prisma, sub);
      const output = await chatWithEmployee(empWithHierarchy, contextPrompt);

      await prisma.chat.create({
        data: { employeeId: sub.id, role: 'user', content: contextPrompt },
      });
      await prisma.chat.create({
        data: { employeeId: sub.id, role: 'assistant', content: output },
      });

      results.push({ id: sub.id, name: sub.name, success: true, output });
    } catch (err: any) {
      results.push({ id: sub.id, name: sub.name, success: false, error: err.message });
    }
  }

  await prisma.auditLog.create({
    data: { actor: 'Bos', action: 'Broadcast', target: employee.id, detail: `Broadcast ke ${subordinates.length} bawahan` },
  });

  res.json({ results });
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
