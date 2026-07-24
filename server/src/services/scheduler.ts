import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { chatWithEmployee } from './chat-service';

interface ScheduledTask {
  task: cron.ScheduledTask;
  jobId: string;
}

const scheduledTasks = new Map<string, ScheduledTask>();

function scheduleJob(prisma: PrismaClient, job: any) {
  if (job.status !== 'active') return;

  const existing = scheduledTasks.get(job.id);
  if (existing) existing.task.stop();

  try {
    const task = cron.schedule(job.schedule, async () => {
      try {
        const output = await chatWithEmployee(job.employee, job.prompt, job.mode || 'plan');

        await prisma.job.update({
          where: { id: job.id },
          data: { lastRun: new Date(), lastResult: 'success', lastOutput: output },
        });
        await prisma.auditLog.create({
          data: { actor: 'System', action: 'Job trigger', target: job.id, detail: `"${job.name}" → ${job.employee.name} ✅` },
        });
      } catch (err: any) {
        await prisma.job.update({
          where: { id: job.id },
          data: { lastRun: new Date(), lastResult: 'failed', lastOutput: err.message },
        });
        await prisma.auditLog.create({
          data: { actor: 'System', action: 'Job error', target: job.id, detail: `"${job.name}" gagal - ${err.message}` },
        });
      }
    });

    scheduledTasks.set(job.id, { task, jobId: job.id });
  } catch (err) {
    console.error(`Failed to schedule job ${job.id}:`, err);
  }
}

export function initScheduler(prisma: PrismaClient) {
  prisma.job.findMany({
    where: { status: 'active' },
    include: { employee: true },
  }).then(jobs => {
    jobs.forEach(job => scheduleJob(prisma, job));
  });

  // Re-check every 5 min for jobs not yet scheduled (e.g. employee just came online)
  cron.schedule('*/5 * * * *', () => {
    prisma.job.findMany({
      where: { status: 'active' },
      include: { employee: true },
    }).then(jobs => {
      jobs.forEach(job => {
        if (!scheduledTasks.has(job.id)) {
          scheduleJob(prisma, job);
        }
      });
    });
  });
}

export function rescheduleJob(prisma: PrismaClient, jobId: string) {
  prisma.job.findUnique({
    where: { id: jobId },
    include: { employee: true },
  }).then(job => {
    if (job) scheduleJob(prisma, job);
  });
}

export function cancelJob(jobId: string) {
  const existing = scheduledTasks.get(jobId);
  if (existing) {
    existing.task.stop();
    scheduledTasks.delete(jobId);
  }
}