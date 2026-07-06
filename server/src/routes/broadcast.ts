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

router.post('/', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  const employees = await prisma.employee.findMany({ where: { status: 'online' } });
  if (employees.length === 0) return res.json({ results: [] });

  req.setTimeout(300000);

  const enriched = await Promise.all(employees.map((emp) => enrichEmployee(prisma, emp)));

  await Promise.all(employees.map((emp) =>
    prisma.chat.create({ data: { employeeId: emp.id, role: 'user', content: prompt } })
  ));

  const results = await Promise.allSettled(
    enriched.map(async (emp) => {
      if (!emp.port) throw new Error('Employee has no port assigned');
      const output = await chatWithEmployee(emp, prompt);
      await prisma.chat.create({ data: { employeeId: emp.id, role: 'assistant', content: output } });
      return { id: emp.id, name: emp.name, success: true as const, output };
    })
  );

  const resultList = results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return { id: employees[i].id, name: employees[i].name, success: false as const, error: r.reason.message };
  });

  await prisma.auditLog.create({
    data: { actor: 'Bos', action: 'Chat', target: 'broadcast', detail: `Broadcast ke ${employees.length} karyawan` },
  });

  res.json({ results: resultList });
});

export { router as broadcastRouter };
