import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const jobs = await prisma.job.findMany({ include: { employee: true }, orderBy: { createdAt: 'desc' } });
  res.json(jobs);
});

router.post('/', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { employeeId, name, schedule, prompt } = req.body;
  const job = await prisma.job.create({
    data: { employeeId, name, schedule, prompt },
  });
  await prisma.auditLog.create({
    data: { actor: 'System', action: 'Job trigger', target: job.id, detail: `Job "${name}" dibuat` },
  });
  res.json(job);
});

router.put('/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { employeeId, name, schedule, prompt, status } = req.body;
  const job = await prisma.job.update({
    where: { id: req.params.id },
    data: { employeeId, name, schedule, prompt, status },
  });
  await prisma.auditLog.create({
    data: { actor: 'Bos', action: 'Edit job', target: job.id, detail: `Job "${name}" diubah` },
  });
  res.json(job);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  await prisma.job.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

router.post('/:id/run-now', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const job = await prisma.job.findUnique({
    where: { id: req.params.id },
    include: { employee: true },
  });
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.employee.status !== 'online') {
    return res.status(400).json({ error: 'Employee is offline' });
  }

  try {
    const systemPrompt = `Kamu adalah ${job.employee.name}, seorang ${job.employee.rank}.
Deskripsi pekerjaan: ${job.employee.jobDesc}
Jam kerja: ${job.employee.workStart} - ${job.employee.workEnd}`;

    const response = await fetch(`http://127.0.0.1:${job.employee.port}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parts: [{ type: 'text', text: job.prompt }],
        system: systemPrompt,
        model: job.employee.model,
      }),
      signal: AbortSignal.timeout(120000),
    });

    const data = await response.json();
    const output = data.message || data.response || JSON.stringify(data);

    await prisma.job.update({
      where: { id: job.id },
      data: { lastRun: new Date(), lastResult: 'success', lastOutput: output },
    });
    await prisma.auditLog.create({
      data: { actor: 'System', action: 'Job trigger', target: job.id, detail: `"${job.name}" → ${job.employee.name} ✅` },
    });
    res.json({ success: true, output });
  } catch (err: any) {
    await prisma.job.update({
      where: { id: job.id },
      data: { lastRun: new Date(), lastResult: 'failed', lastOutput: err.message },
    });
    await prisma.auditLog.create({
      data: { actor: 'System', action: 'Job error', target: job.id, detail: `"${job.name}" gagal - ${err.message}` },
    });
    res.status(502).json({ error: err.message });
  }
});

export { router as jobsRouter };
