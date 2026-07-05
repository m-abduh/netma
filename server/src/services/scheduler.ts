import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { chatWithEmployee } from './opencode';

export function initScheduler(prisma: PrismaClient) {
  cron.schedule('* * * * *', async () => {
    try {
      const jobs = await prisma.job.findMany({
        where: { status: 'active' },
        include: { employee: true },
      });

      for (const job of jobs) {
        if (!cron.validate(job.schedule)) continue;

        const nextRun = cron.schedule(job.schedule).nextDate();
        const now = new Date();
        const diff = nextRun.getTime() - now.getTime();
        if (diff < 0 || diff > 60000) continue;

        if (job.employee.status !== 'online') continue;

        try {
          const output = await chatWithEmployee(job.employee, job.prompt);

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
      }
    } catch (err) {
      console.error('Scheduler error:', err);
    }
  });
}
