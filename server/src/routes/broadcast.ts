import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { chatWithEmployee } from '../services/opencode';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  const employees = await prisma.employee.findMany({ where: { status: 'online' } });
  if (employees.length === 0) return res.json({ results: [] });

  const results: { id: string; name: string; success: boolean; output?: string; error?: string }[] = [];

  for (const emp of employees) {
    try {
      const output = await chatWithEmployee(emp, prompt);

      await prisma.chat.create({
        data: { employeeId: emp.id, role: 'user', content: prompt },
      });
      await prisma.chat.create({
        data: { employeeId: emp.id, role: 'assistant', content: output },
      });

      results.push({ id: emp.id, name: emp.name, success: true, output });
    } catch (err: any) {
      results.push({ id: emp.id, name: emp.name, success: false, error: err.message });
    }
  }

  await prisma.auditLog.create({
    data: { actor: 'Bos', action: 'Chat', target: 'broadcast', detail: `Broadcast ke ${employees.length} karyawan` },
  });

  res.json({ results });
});

export { router as broadcastRouter };
