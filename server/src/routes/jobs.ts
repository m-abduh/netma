import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { chatWithEmployee } from '../services/opencode';
import { rescheduleJob, cancelJob } from '../services/scheduler';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const jobs = await prisma.job.findMany({ include: { employee: true }, orderBy: { createdAt: 'desc' } });
  res.json(jobs);
});

router.post('/', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { employeeId, name, schedule, prompt, mode } = req.body;
  const job = await prisma.job.create({
    data: { employeeId, name, schedule, prompt, mode: mode || 'plan' },
  });
  await prisma.auditLog.create({
    data: { actor: 'System', action: 'Job trigger', target: job.id, detail: `Job "${name}" dibuat` },
  });
  rescheduleJob(prisma, job.id);
  res.json(job);
});

router.put('/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { employeeId, name, schedule, prompt, status, mode } = req.body;
  const job = await prisma.job.update({
    where: { id: req.params.id },
    data: { employeeId, name, schedule, prompt, status, mode },
  });
  await prisma.auditLog.create({
    data: { actor: 'Bos', action: 'Edit job', target: job.id, detail: `Job "${name}" diubah` },
  });
  rescheduleJob(prisma, job.id);
  res.json(job);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  await prisma.job.delete({ where: { id: req.params.id } });
  cancelJob(req.params.id);
  res.json({ success: true });
});

router.post('/:id/run-now', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const job = await prisma.job.findUnique({
    where: { id: req.params.id },
    include: { employee: true },
  });
  if (!job) return res.status(404).json({ error: 'Job not found' });

  await prisma.job.update({
    where: { id: job.id },
    data: { lastRun: new Date(), lastResult: 'running', lastOutput: null },
  });

  res.json({ success: true, message: `Job "${job.name}" triggered for ${job.employee.name}` });

  runJobInBackground(prisma, job);
});

async function runJobInBackground(prisma: PrismaClient, job: any) {
  await prisma.chat.create({
    data: { employeeId: job.employee.id, role: 'user', content: `[Job: ${job.name}] ${job.prompt}` },
  });

  try {
    const output = await chatWithEmployee(job.employee, job.prompt, job.mode || 'plan');

    await prisma.chat.create({
      data: { employeeId: job.employee.id, role: 'assistant', content: output },
    });
    await prisma.job.update({
      where: { id: job.id },
      data: { lastResult: 'success', lastOutput: output },
    });
    await prisma.auditLog.create({
      data: { actor: 'System', action: 'Job trigger', target: job.id, detail: `"${job.name}" → ${job.employee.name} ✅` },
    });
  } catch (err: any) {
    await prisma.job.update({
      where: { id: job.id },
      data: { lastResult: 'failed', lastOutput: err.message },
    });
    await prisma.auditLog.create({
      data: { actor: 'System', action: 'Job error', target: job.id, detail: `"${job.name}" gagal - ${err.message}` },
    });
  }
}

export { router as jobsRouter };
